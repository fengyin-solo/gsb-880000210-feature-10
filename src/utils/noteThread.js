// 修复备注追踪的纯逻辑层：不依赖 Vue / localStorage，方便单测与复用。

/** 可选的关联工序 */
export const restorationProcesses = [
  '拍照建档',
  '低压除尘',
  '喷雾回软',
  '局部补纸',
  '控湿平整',
  '纤维加固',
  '透明托裱',
  '无酸归档',
]

/** 阶段到关联工序的默认映射 */
export function defaultProcessForStage(stage) {
  const map = {
    补纸前: '局部补纸',
    控湿中: '控湿平整',
    归档前: '无酸归档',
  }
  return map[stage] ?? restorationProcesses[0]
}

/** 线程按时间升序排列（id 兜底，保证不同设备排序稳定） */
function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

/**
 * 由批次档案、任务清单中的历史说明构造初始只读备注。
 * 旧备注在任何流程下都不会被修改或覆盖。
 */
export function buildSeedThread(object) {
  const batch = object.batchNote
  const task = object.taskNote

  const entries = []

  if (batch) {
    entries.push({
      id: `${object.id}-seed-batch`,
      content: batch,
      author: object.owner,
      process: defaultProcessForStage(object.stage),
      createdAt: '2026-09-20T09:00:00.000Z',
      legacy: true,
      source: '批次档案',
    })
  }

  if (task) {
    entries.push({
      id: `${object.id}-seed-task`,
      content: task,
      author: object.owner,
      process: defaultProcessForStage(object.stage),
      createdAt: '2026-09-21T09:00:00.000Z',
      legacy: true,
      source: '任务清单',
    })
  }

  return {
    objectId: object.id,
    version: 1,
    entries: sortEntries(entries),
  }
}

/**
 * 读取持久化数据时与种子数据合并：
 * 已有线程以存储内容为准（保留用户记录），缺失对象只补种子。
 */
export function hydrateThreads(storedThreads, objects) {
  const result = {}

  if (storedThreads && typeof storedThreads === 'object') {
    for (const [objectId, thread] of Object.entries(storedThreads)) {
      if (
        thread &&
        typeof thread === 'object' &&
        Array.isArray(thread.entries)
      ) {
        result[objectId] = {
          objectId,
          version: Number.isFinite(thread.version) ? thread.version : 1,
          entries: sortEntries(thread.entries),
        }
      }
    }
  }

  for (const object of objects) {
    if (!result[object.id]) {
      result[object.id] = buildSeedThread(object)
    }
  }

  return result
}

/** 保存失败时返回的错误类型 */
export const NOTE_ERRORS = {
  EMPTY: 'EMPTY',
  UNKNOWN_OBJECT: 'UNKNOWN_OBJECT',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  DUPLICATE: 'DUPLICATE',
}

/**
 * 向对象线程追加一条处理备注。
 * - 内容为空：拒绝
 * * - 版本冲突（expectedVersion 与当前版本不一致）：拒绝，原版本不动
 * - 与最后一条备注的内容/修复师/工序完全相同：视为连续重复保存，拒绝
 * 返回 { ok, error?, note?, threads }；失败时 threads 保持原引用。
 */
export function appendNote(threads, objectId, draft, options = {}) {
  const content = (draft.content ?? '').trim()

  if (!content) {
    return { ok: false, error: NOTE_ERRORS.EMPTY, threads }
  }

  const thread = threads[objectId]
  if (!thread) {
    return { ok: false, error: NOTE_ERRORS.UNKNOWN_OBJECT, threads }
  }

  const expectedVersion = options.expectedVersion ?? thread.version
  if (expectedVersion !== thread.version) {
    return { ok: false, error: NOTE_ERRORS.VERSION_CONFLICT, threads }
  }

  const author = (draft.author ?? '').trim()
  const process = (draft.process ?? '').trim()
  const last = thread.entries[thread.entries.length - 1]
  if (
    last &&
    last.content === content &&
    last.author === author &&
    last.process === process
  ) {
    return { ok: false, error: NOTE_ERRORS.DUPLICATE, threads }
  }

  const now = options.now instanceof Date ? options.now : new Date()
  const note = {
    id:
      options.id ??
      `note-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    author,
    process,
    createdAt: now.toISOString(),
    legacy: false,
  }

  const nextThreads = {
    ...threads,
    [objectId]: {
      ...thread,
      version: thread.version + 1,
      entries: sortEntries([...thread.entries, note]),
    },
  }

  return { ok: true, note, threads: nextThreads }
}
