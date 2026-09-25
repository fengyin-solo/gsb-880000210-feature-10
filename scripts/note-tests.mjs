// 备注追踪核心约束的最小校验脚本（node scripts/note-tests.mjs）
import assert from 'node:assert/strict'

// localStorage 垫片 + 可切换的写入失败
const storage = new Map()
let failWrites = false
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    if (failWrites) throw new Error('quota exceeded')
    storage.set(key, value)
  },
  removeItem: (key) => storage.delete(key),
}

const {
  buildSeedThread,
  hydrateThreads,
  appendNote,
  NOTE_ERRORS,
} = await import('../src/utils/noteThread.js')

const { restorationObjects } = await import('../src/data/restorationData.js')

const [obj] = restorationObjects
let threads = hydrateThreads(null, restorationObjects)

// 1. 旧备注播种：每个对象有批次档案 + 任务清单两条只读备注
for (const object of restorationObjects) {
  const thread = threads[object.id]
  assert.equal(thread.entries.length, 2, `${object.id} 初始应有两条旧备注`)
  assert.ok(thread.entries.every((entry) => entry.legacy), '旧备注必须只读')
  assert.equal(thread.version, 1)
}

// 2. 空内容不能生成记录
let res = appendNote(threads, obj.id, { content: '   ', author: '韩澈', process: '局部补纸' })
assert.equal(res.ok, false)
assert.equal(res.error, NOTE_ERRORS.EMPTY)

// 3. 正常追加：带时间/修复师/工序，版本推进
res = appendNote(
  threads,
  obj.id,
  { content: '标题栏已完成固色', author: '韩澈', process: '局部补纸' },
  { now: new Date('2026-09-22T03:00:00Z'), id: 'n1' },
)
assert.equal(res.ok, true)
assert.equal(res.note.createdAt, '2026-09-22T03:00:00.000Z')
assert.equal(res.note.author, '韩澈')
assert.equal(res.note.process, '局部补纸')
assert.equal(res.note.legacy, false)
assert.equal(res.threads[obj.id].version, 2)
assert.equal(res.threads[obj.id].entries.length, 3)
threads = res.threads

// 4. 同一条连续保存两次（内容/修复师/工序完全相同）不产生重复
res = appendNote(threads, obj.id, {
  content: '标题栏已完成固色',
  author: '韩澈',
  process: '局部补纸',
})
assert.equal(res.ok, false)
assert.equal(res.error, NOTE_ERRORS.DUPLICATE)
assert.equal(threads[obj.id].entries.length, 3, '重复保存后数量不变')

// 工序不同不算重复
res = appendNote(threads, obj.id, {
  content: '标题栏已完成固色',
  author: '韩澈',
  process: '拍照建档',
})
assert.equal(res.ok, true)
threads = res.threads

// 5. 版本冲突：基于过期版本保存被拒绝，原版本不动
const currentVersion = threads[obj.id].version
res = appendNote(
  threads,
  obj.id,
  { content: '另一个会话的内容', author: '陆宁', process: '控湿平整' },
  { expectedVersion: currentVersion - 1 },
)
assert.equal(res.ok, false)
assert.equal(res.error, NOTE_ERRORS.VERSION_CONFLICT)
assert.equal(threads[obj.id].version, currentVersion)

// 6. 未知对象拒绝
res = appendNote(threads, 'X-99', { content: 'x', author: 'a', process: 'p' })
assert.equal(res.error, NOTE_ERRORS.UNKNOWN_OBJECT)

// 7. 刷新重读：hydrate 已持久化的线程，数量与内容与最后一次有效保存一致
const reloaded = hydrateThreads(JSON.parse(JSON.stringify(threads)), restorationObjects)
assert.deepEqual(
  reloaded[obj.id].entries.map((entry) => entry.content),
  threads[obj.id].entries.map((entry) => entry.content),
)
assert.equal(reloaded[obj.id].version, currentVersion)

// 8. 旧备注在追加后仍保留且不可被新流程覆盖
const legacy = reloaded[obj.id].entries.filter((entry) => entry.legacy)
assert.equal(legacy.length, 2)
assert.deepEqual(
  legacy.map((entry) => entry.source).sort(),
  ['任务清单', '批次档案'],
)

// 9. hydrate 只补缺，不覆盖用户已保存线程；未知对象的线程也保留
const partial = { [obj.id]: threads[obj.id], 'X-UNKNOWN': { version: 9, entries: [] } }
const merged = hydrateThreads(partial, restorationObjects)
assert.equal(merged[obj.id].version, currentVersion)
assert.equal(merged['X-UNKNOWN'].version, 9, '无法识别对象的旧数据也不丢弃')
assert.ok(merged['B-11'].entries.length, '缺失对象补播种')

// 10. 存储层失败时 store 保留原版本
const { useRestorationNotes, setStorageFailure, reloadFromStorage } = await import(
  '../src/composables/useRestorationNotes.js'
)
const store = useRestorationNotes()

// 先成功保存一次，建立持久化基线（最后一次有效内容）
const seeded = store.saveNote('B-11', {
  content: '降湿 24 小时记录',
  author: '陆宁',
  process: '控湿平整',
})
assert.equal(seeded.ok, true)

const beforeVersion = store.threadFor('B-11').version
const beforeCount = store.notesFor('B-11').length
failWrites = true
setStorageFailure(true)
const failed = store.saveNote('B-11', {
  content: '存储故障时不应留下的记录',
  author: '陆宁',
  process: '控湿平整',
})
setStorageFailure(false)
failWrites = false
assert.equal(failed.ok, false)
assert.equal(failed.error, 'PERSIST_FAILED')
assert.equal(store.threadFor('B-11').version, beforeVersion, '内存原版本保留')
assert.equal(store.notesFor('B-11').length, beforeCount, '失败记录不入内存')
assert.equal(
  JSON.parse(storage.get('conservation-desk/restoration-notes/v1'))['B-11'].entries.length,
  beforeCount,
  '存储中也无失败记录',
)
// 垫片与模块开关都必须复位，后续保存才能成功
failWrites = false

// 11. 刷新后读到的是最后一次有效内容
const saved = store.saveNote('B-11', {
  content: '降湿满 48 小时，转入纤维加固',
  author: '陆宁',
  process: '纤维加固',
})
assert.equal(saved.ok, true)
reloadFromStorage()
const latest = store.latestNoteFor('B-11')
assert.equal(latest.content, '降湿满 48 小时，转入纤维加固')
assert.equal(latest.author, '陆宁')
assert.equal(latest.process, '纤维加固')
assert.ok(latest.createdAt)

// 12. 两个 store 实例（模拟任务清单 + 工作台）读到同一份状态
const another = useRestorationNotes()
assert.equal(another.noteCountFor('B-11'), store.noteCountFor('B-11'))
assert.equal(another.latestNoteFor('B-11').content, store.latestNoteFor('B-11').content)

console.log('全部备注追踪校验通过 ✓')
