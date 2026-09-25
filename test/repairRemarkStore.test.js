// 存储核心规则测试：node test/repairRemarkStore.test.js
import assert from 'node:assert/strict'

import {
  REMARK_ERRORS,
  REMARK_STORAGE_KEY,
  buildLegacyRemarks,
  createMemoryStorage,
  createRepairRemarkStore,
} from '../src/stores/repairRemarkStoreCore.js'

const tasks = [
  { id: 'A-03', owner: '韩澈', note: '虫道贯穿标题栏，需先固色。' },
  { id: 'B-11', owner: '陆宁', note: '边缘卷曲，可延后压平。' },
]
const seeds = buildLegacyRemarks(tasks)

function makeClock(start = '2026-09-25T09:00:00') {
  let minutes = 0
  return () => {
    const d = new Date(start)
    d.setMinutes(d.getMinutes() + minutes)
    minutes += 1
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}:00`
  }
}

let idSeq = 0
const createId = () => `t-${++idSeq}`

// 1. 首次使用植入只读旧备注，并立即持久化（刷新后仍在、且不重复植入）
{
  const storage = createMemoryStorage()
  const store = createRepairRemarkStore({
    storage,
    seeds,
    now: makeClock(),
    createId,
  })
  assert.equal(store.remarksFor('A-03').length, 1)
  assert.ok(store.remarksFor('A-03')[0].legacy)

  // 模拟刷新：同一存储重新创建存储实例，旧备注仍只有一份
  const reopened = createRepairRemarkStore({ storage, seeds, now: makeClock(), createId })
  assert.equal(reopened.remarksFor('A-03').length, 1)
  assert.equal(reopened.getRemarks().length, 2)
}

// 2. 有效备注带时间、修复师、关联工序，可持久化并按时间排序
{
  const storage = createMemoryStorage()
  const store = createRepairRemarkStore({
    storage,
    seeds,
    now: makeClock(),
    createId,
  })
  const result = store.addRemark({
    targetId: 'A-03',
    content: '完成固色，色牢度达标。',
    repairer: '韩澈',
    process: '固色处理',
  })
  assert.ok(result.ok)
  assert.equal(result.remark.content, '完成固色，色牢度达标。')
  assert.equal(result.remark.repairer, '韩澈')
  assert.equal(result.remark.process, '固色处理')
  assert.ok(result.remark.time)
  assert.equal(result.remark.legacy, false)

  const reopened = createRepairRemarkStore({ storage, seeds, now: makeClock(), createId })
  assert.equal(reopened.remarksFor('A-03').length, 2)
  assert.equal(reopened.remarksFor('A-03')[1].content, '完成固色，色牢度达标。')
}

// 3. 空备注（含纯空白）不生成记录
{
  const store = createRepairRemarkStore({
    storage: createMemoryStorage(),
    seeds,
    now: makeClock(),
    createId,
  })
  assert.equal(store.addRemark({ targetId: 'A-03', content: '   ' }).error, REMARK_ERRORS.EMPTY)
  assert.equal(store.addRemark({ targetId: 'A-03', content: '' }).error, REMARK_ERRORS.EMPTY)
  assert.equal(store.remarksFor('A-03').length, 1)
}

// 4. 修复师或工序缺失不生成记录
{
  const store = createRepairRemarkStore({
    storage: createMemoryStorage(),
    seeds,
    now: makeClock(),
    createId,
  })
  assert.equal(
    store.addRemark({ targetId: 'A-03', content: '有内容', repairer: '韩澈', process: '' }).error,
    REMARK_ERRORS.MISSING_FIELD,
  )
  assert.equal(
    store.addRemark({ targetId: 'A-03', content: '有内容', repairer: '', process: '固色处理' })
      .error,
    REMARK_ERRORS.MISSING_FIELD,
  )
  assert.equal(store.remarksFor('A-03').length, 1)
}

// 5. 同一对象连续保存两次相同内容（含修复师、工序）→ 拒绝重复；换工序则允许
{
  const store = createRepairRemarkStore({
    storage: createMemoryStorage(),
    seeds,
    now: makeClock(),
    createId,
  })
  const payload = {
    targetId: 'B-11',
    content: '降湿已 24 小时。',
    repairer: '陆宁',
    process: '控湿处理',
  }
  assert.ok(store.addRemark(payload).ok)
  const dup = store.addRemark({ ...payload })
  assert.equal(dup.error, REMARK_ERRORS.DUPLICATE)
  assert.equal(store.remarksFor('B-11').length, 2)

  // 不同工序或不同修复师不算连续重复
  assert.ok(store.addRemark({ ...payload, process: '纤维加固' }).ok)
  assert.equal(store.remarksFor('B-11').length, 3)

  // 不同对象相同内容互不影响
  assert.ok(store.addRemark({ ...payload, targetId: 'A-03', repairer: '韩澈' }).ok)
}

// 6. 版本冲突：持旧版本保存被拒，原版本保留；另一对象不受影响
{
  const store = createRepairRemarkStore({
    storage: createMemoryStorage(),
    seeds,
    now: makeClock(),
    createId,
  })
  assert.ok(
    store.addRemark({
      targetId: 'A-03',
      content: '第一条新备注。',
      repairer: '韩澈',
      process: '固色处理',
    }).ok,
  )
  // 别处已写入（版本从 1 变 2），此处仍拿旧版本 1 提交
  const stale = store.addRemark({
    targetId: 'A-03',
    content: '基于旧版本的备注。',
    repairer: '韩澈',
    process: '固色处理',
    expectedVersion: 1,
  })
  assert.equal(stale.error, REMARK_ERRORS.CONFLICT)
  assert.equal(store.remarksFor('A-03').length, 2)
  assert.ok(!store.remarksFor('A-03').some((r) => r.content === '基于旧版本的备注。'))

  // 以最新版本重基后可以保存
  assert.ok(
    store.addRemark({
      targetId: 'A-03',
      content: '基于新版本的备注。',
      repairer: '韩澈',
      process: '固色处理',
      expectedVersion: 2,
    }).ok,
  )
  assert.equal(store.remarksFor('A-03').length, 3)
}

// 7. 持久化失败时保留原版本（内存与磁盘都不变，也不通知订阅者）
{
  const failingStorage = createMemoryStorage()
  const store = createRepairRemarkStore({
    storage: failingStorage,
    seeds,
    now: makeClock(),
    createId,
  })
  const before = store.remarksFor('A-03').length
  const beforeRaw = failingStorage.getItem(REMARK_STORAGE_KEY)
  let notified = 0
  store.subscribe(() => (notified += 1))

  failingStorage.setItem = () => {
    throw new Error('disk full')
  }
  const result = store.addRemark({
    targetId: 'A-03',
    content: '写不进去的备注。',
    repairer: '韩澈',
    process: '固色处理',
  })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'PERSIST')
  assert.equal(store.remarksFor('A-03').length, before)
  assert.equal(failingStorage.getItem(REMARK_STORAGE_KEY), beforeRaw)
  assert.equal(notified, 0)
}

// 8. 旧备注只读保留：任何新增流程都不改写已有记录的内容与元数据
{
  const storage = createMemoryStorage()
  const store = createRepairRemarkStore({
    storage,
    seeds,
    now: makeClock(),
    createId,
  })
  const legacySnapshot = JSON.parse(JSON.stringify(store.remarksFor('A-03')))
  store.addRemark({
    targetId: 'A-03',
    content: '后续新流程备注。',
    repairer: '周恬',
    process: '归档入盒',
  })
  store.addRemark({ targetId: 'A-03', content: ' ' })
  store.addRemark({
    targetId: 'A-03',
    content: '后续新流程备注。',
    repairer: '周恬',
    process: '归档入盒',
  })
  assert.deepEqual(store.remarksFor('A-03')[0], legacySnapshot[0])

  const reopened = createRepairRemarkStore({ storage, seeds, now: makeClock(), createId })
  assert.deepEqual(reopened.remarksFor('A-03')[0], legacySnapshot[0])
}

// 9. 存储损坏时不重新植入旧备注（避免旧记录被"新流程"重复覆盖）
{
  const storage = createMemoryStorage()
  storage.setItem(REMARK_STORAGE_KEY, '{broken json')
  const store = createRepairRemarkStore({ storage, seeds, now: makeClock(), createId })
  assert.equal(store.getRemarks().length, 0)
}

// 10. 两处视图（任务清单 / 工作台）共用存储：数量与说明始终一致
{
  const storage = createMemoryStorage()
  const store = createRepairRemarkStore({
    storage,
    seeds,
    now: makeClock(),
    createId,
  })
  // 模拟两个视图各自的订阅快照
  let taskView = store.getRemarks()
  let deskView = store.getRemarks()
  store.subscribe((next) => {
    taskView = next
    deskView = next
  })

  store.addRemark({
    targetId: 'A-03',
    content: '工作台录入：补纸完成。',
    repairer: '韩澈',
    process: '局部补纸',
  })

  // "切换对象再进入"：两处都重新按对象过滤
  const fromTasks = taskView.filter((r) => r.targetId === 'A-03')
  const fromDesk = deskView.filter((r) => r.targetId === 'A-03')
  assert.equal(fromTasks.length, fromDesk.length)
  assert.deepEqual(
    fromTasks.map((r) => r.content),
    fromDesk.map((r) => r.content),
  )
  assert.equal(fromTasks.at(-1).content, '工作台录入：补纸完成。')
}

console.log('repairRemarkStore: all tests passed')
