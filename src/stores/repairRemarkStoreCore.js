// 修复备注存储核心（纯 JS，不依赖 Vue，便于在 Node 中直接测试）
//
// 规则：
// - 每条备注带时间、修复师、关联工序；历史 note 作为只读旧备注一次性植入。
// - 空备注、版本冲突、与同一对象上一条完全相同的内容，都不会产生记录。
// - 写入成功后持久化，刷新仍读到最后一次有效内容；任何写入失败都保留原版本。

export const REMARK_STORAGE_KEY = 'conservation-desk:repair-remarks:v1'

export const REMARK_ERRORS = {
  EMPTY: 'EMPTY', // 备注内容为空
  MISSING_FIELD: 'MISSING_FIELD', // 修复师或工序缺失
  CONFLICT: 'CONFLICT', // 版本不匹配，已被别处更新
  DUPLICATE: 'DUPLICATE', // 与该对象上一条备注完全相同
}

// 旧备注（任务清单原有 note）的固定建档时间，只读展示，不会被新流程覆盖
const LEGACY_TIMES = {
  'A-03': '2026-09-20T09:15:00',
  'B-11': '2026-09-20T10:40:00',
  'C-02': '2026-09-20T14:05:00',
}

// 由任务清单的原始 note 生成只读历史备注，只在本地没有任何数据时植入一次
export function buildLegacyRemarks(tasks) {
  return tasks.map((task) => ({
    id: `legacy-${task.id}`,
    targetId: task.id,
    content: task.note,
    repairer: task.owner,
    process: '拍照建档',
    time: LEGACY_TIMES[task.id] ?? '2026-09-20T08:00:00',
    legacy: true,
  }))
}

export function normalizeContent(content) {
  return String(content ?? '').trim()
}

// 内存兜底存储：localStorage 不可用（隐私模式 / 测试环境）时保证功能可用
export function createMemoryStorage() {
  const map = new Map()
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
  }
}

function createBrowserStorage() {
  try {
    const probe = '__conservation_desk_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return createMemoryStorage()
  }
}

function byTimeAsc(a, b) {
  const diff = new Date(a.time).getTime() - new Date(b.time).getTime()
  return diff !== 0 ? diff : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * 创建修复备注存储。
 * @param {object} options
 * @param {Storage} options.storage  持久化后端
 * @param {Array}  options.seeds    首次使用时植入的只读旧备注
 * @param {() => string} [options.now]  可注入的时间函数（测试用）
 * @param {() => string} [options.createId] 可注入的 id 函数（测试用）
 */
export function createRepairRemarkStore(options = {}) {
  const storage = options.storage ?? createBrowserStorage()
  const seeds = options.seeds ?? []
  const now =
    options.now ??
    (() => {
      const d = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
      )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })
  let seq = 0
  const createId =
    options.createId ??
    (() => {
      seq += 1
      return `remark-${Date.now().toString(36)}-${seq}`
    })

  let remarks = load()
  const listeners = new Set()

  function load() {
    let raw = null
    try {
      raw = storage.getItem(REMARK_STORAGE_KEY)
    } catch {
      raw = null
    }
    // null / undefined 都视为"从未使用"，此时才植入旧备注；损坏数据不重新植入
    if (raw == null) {
      const seeded = [...seeds].sort(byTimeAsc)
      persist(seeded)
      return seeded
    }
    try {
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed) ? parsed : parsed.remarks
      if (Array.isArray(list)) {
        return [...list].sort(byTimeAsc)
      }
    } catch {
      // 落到空列表，保留存储原文，等下一次有效保存时才覆盖
    }
    return []
  }

  // 写盘失败时抛错，由调用方保证内存中的原版本不动
  function persist(next) {
    storage.setItem(REMARK_STORAGE_KEY, JSON.stringify(next))
  }

  function emit() {
    listeners.forEach((listener) => listener(remarks))
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  function getRemarks() {
    return remarks
  }

  function remarksFor(targetId) {
    return remarks.filter((item) => item.targetId === targetId)
  }

  /**
   * 新增一条备注。
   * @returns {{ ok: true, remark: object } | { ok: false, error: string }}
   */
  function addRemark(entry = {}) {
    const content = normalizeContent(entry.content)
    const targetId = String(entry.targetId ?? '').trim()
    const repairer = String(entry.repairer ?? '').trim()
    const process = String(entry.process ?? '').trim()

    if (!content) return { ok: false, error: REMARK_ERRORS.EMPTY }
    if (!targetId || !repairer || !process) {
      return { ok: false, error: REMARK_ERRORS.MISSING_FIELD }
    }

    const targetRemarks = remarksFor(targetId)
    const expectedVersion = Number.isInteger(entry.expectedVersion)
      ? entry.expectedVersion
      : targetRemarks.length

    // 乐观锁：调用方持有的版本落后于当前版本即拒绝，保留已有记录
    if (expectedVersion !== targetRemarks.length) {
      return { ok: false, error: REMARK_ERRORS.CONFLICT }
    }

    // 与该对象上一条备注（内容、修复师、工序）完全一致视为连续重复保存
    const last = targetRemarks[targetRemarks.length - 1]
    if (
      last &&
      last.content === content &&
      last.repairer === repairer &&
      last.process === process
    ) {
      return { ok: false, error: REMARK_ERRORS.DUPLICATE }
    }

    const remark = {
      id: createId(),
      targetId,
      content,
      repairer,
      process,
      time: now(),
      legacy: false,
    }

    const next = [...remarks, remark].sort(byTimeAsc)
    try {
      persist(next)
    } catch {
      // 写盘失败：内存与磁盘都保留原版本
      return { ok: false, error: 'PERSIST' }
    }
    remarks = next
    emit()
    return { ok: true, remark }
  }

  return {
    subscribe,
    getRemarks,
    remarksFor,
    addRemark,
  }
}
