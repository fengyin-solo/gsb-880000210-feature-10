import { computed, onScopeDispose, ref } from 'vue'

import { repairRemarkStore } from '../stores/repairRemarkStore'
import { REMARK_ERRORS } from '../stores/repairRemarkStoreCore'

// 订阅单例存储，把纯数组包装成响应式视图
export function useRepairRemarks() {
  const remarks = ref(repairRemarkStore.getRemarks())

  const unsubscribe = repairRemarkStore.subscribe((next) => {
    remarks.value = next
  })
  onScopeDispose(unsubscribe)

  const remarksByTarget = computed(() => {
    const groups = new Map()
    for (const remark of remarks.value) {
      const list = groups.get(remark.targetId)
      if (list) list.push(remark)
      else groups.set(remark.targetId, [remark])
    }
    return groups
  })

  const countByTarget = computed(() => {
    const counts = {}
    for (const remark of remarks.value) {
      counts[remark.targetId] = (counts[remark.targetId] ?? 0) + 1
    }
    return counts
  })

  function remarksFor(targetId) {
    return remarks.value.filter((item) => item.targetId === targetId)
  }

  function countFor(targetId) {
    return countByTarget.value[targetId] ?? 0
  }

  function addRemark(entry) {
    return repairRemarkStore.addRemark(entry)
  }

  return {
    remarks,
    remarksByTarget,
    countByTarget,
    remarksFor,
    countFor,
    addRemark,
    REMARK_ERRORS,
  }
}
