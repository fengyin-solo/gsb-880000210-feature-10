// 备注线程的本地持久化仓储。
// 存储异常（隐私模式 / 配额 / 被浏览器拒绝）会向上抛出，由 store 回滚。

export const NOTE_STORAGE_KEY = 'conservation-desk/restoration-notes/v1'

let simulateFailure = false

/** 仅供原型演示：让下一次写入抛出异常，验证失败回滚 */
export function setStorageFailure(enabled) {
  simulateFailure = enabled
}

export function isStorageFailureOn() {
  return simulateFailure
}

export function loadStoredThreads() {
  try {
    const raw = localStorage.getItem(NOTE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    // 数据损坏时不清除旧版本，交由上层重新播种（用户已保存的有效数据仍可能可读）
    return null
  }
}

export function saveStoredThreads(threads) {
  if (simulateFailure) {
    throw new Error('模拟的本地存储写入失败')
  }
  localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(threads))
}
