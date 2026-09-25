import { computed, ref } from 'vue'

import { restorationObjects } from '../data/restorationData.js'
import {
  hydrateThreads,
  appendNote,
  NOTE_ERRORS,
} from '../utils/noteThread.js'
import {
  loadStoredThreads,
  saveStoredThreads,
  setStorageFailure,
} from '../utils/noteRepository.js'

export { NOTE_ERRORS }
export { setStorageFailure }

// 模块级单例：任务清单与工作台无论进入顺序如何都共享同一份状态
const threads = ref({})
const lastError = ref('')
let initialized = false

function init() {
  if (initialized) return
  initialized = true
  threads.value = hydrateThreads(loadStoredThreads(), restorationObjects)

  if (typeof window !== 'undefined') {
    // 另一个标签页写入后，合并最新版本：本标签页里未刷新的表单再保存会撞版本冲突
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key.indexOf('restoration-notes') === -1) return
      threads.value = hydrateThreads(loadStoredThreads(), restorationObjects)
    })
  }
}

/** 模拟刷新页面：丢弃内存状态，从本地存储重新读取最后一次有效内容 */
export function reloadFromStorage() {
  init()
  threads.value = hydrateThreads(loadStoredThreads(), restorationObjects)
}

/**
 * 保存一条处理备注。
 * 纯函数校验通过后才写本地存储；写入抛错时内存状态保持原样（保留原版本）。
 */
export function saveNote(objectId, draft, expectedVersion) {
  init()
  lastError.value = ''

  const result = appendNote(threads.value, objectId, draft, { expectedVersion })
  if (!result.ok) {
    lastError.value = result.error
    return result
  }

  try {
    saveStoredThreads(result.threads)
  } catch {
    // 持久化失败：不替换内存中的原版本，调用方保留表单内容供重试
    lastError.value = 'PERSIST_FAILED'
    return { ok: false, error: 'PERSIST_FAILED', threads: threads.value }
  }

  threads.value = result.threads
  return result
}

/**
 * 原型演示用：模拟其他标签页改动了该对象（版本号推进但内容由别处维护），
 * 用于验证版本冲突提示。
 */
export function simulateExternalChange(objectId) {
  init()
  const thread = threads.value[objectId]
  if (!thread) return
  const bumped = {
    ...threads.value,
    [objectId]: { ...thread, version: thread.version + 1 },
  }
  try {
    saveStoredThreads(bumped)
  } catch {
    // 演示开关处于失败模式时，只推进内存版本也能触发本标签页的冲突
  }
  threads.value = bumped
}

export function useRestorationNotes() {
  init()

  const objects = restorationObjects

  function objectById(objectId) {
    return objects.find((item) => item.id === objectId) ?? null
  }

  function threadFor(objectId) {
    return threads.value[objectId] ?? null
  }

  function notesFor(objectId) {
    return threadFor(objectId)?.entries ?? []
  }

  function noteCountFor(objectId) {
    return notesFor(objectId).length
  }

  function latestNoteFor(objectId) {
    const entries = notesFor(objectId)
    return entries.length ? entries[entries.length - 1] : null
  }

  const allThreads = computed(() => threads.value)

  return {
    objects,
    allThreads,
    lastError,
    objectById,
    threadFor,
    notesFor,
    noteCountFor,
    latestNoteFor,
    saveNote,
    reloadFromStorage,
    simulateExternalChange,
    setStorageFailure,
  }
}
