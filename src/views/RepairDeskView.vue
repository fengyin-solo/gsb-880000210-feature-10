<script setup>
import { computed, ref } from 'vue'

import PanelSection from '../components/common/PanelSection.vue'
import ObjectRemarks from '../components/restoration/ObjectRemarks.vue'
import { useRepairRemarks } from '../composables/useRepairRemarks'
import { restorationProcesses, restorationTasks } from '../data/restorationData'

const { remarksByTarget } = useRepairRemarks()

const repairers = [...new Set(restorationTasks.map((task) => task.owner))]

// 默认全部收拢，展开后在同一卡片内查看该对象的历史备注并新增处理备注
const openIds = ref([])

function toggle(id) {
  openIds.value = openIds.value.includes(id)
    ? openIds.value.filter((item) => item !== id)
    : [...openIds.value, id]
}

const groups = computed(() =>
  restorationTasks.map((task) => ({
    task,
    remarks: remarksByTarget.value.get(task.id) ?? [],
  })),
)
</script>

<template>
  <div class="view-stack">
    <PanelSection title="修复工作台" badge="按对象收拢">
      <div class="desk-group-list">
        <article
          v-for="group in groups"
          :key="group.task.id"
          class="desk-group"
        >
          <button
            type="button"
            class="desk-group-head"
            :aria-expanded="openIds.includes(group.task.id)"
            @click="toggle(group.task.id)"
          >
            <span class="desk-group-title">
              {{ group.task.title }}
              <small>{{ group.task.stage }} · {{ group.task.owner }}</small>
            </span>
            <span class="desk-group-meta">
              <span class="desk-count">{{ group.remarks.length }} 条备注</span>
              <span
                :class="[
                  'desk-caret',
                  { 'desk-caret--open': openIds.includes(group.task.id) },
                ]"
              >
                展开
              </span>
            </span>
          </button>

          <div v-if="openIds.includes(group.task.id)" class="desk-group-body">
            <ObjectRemarks
              :target="group.task"
              :repairers="repairers"
              :processes="restorationProcesses"
              :show-header="false"
            />
          </div>
        </article>
      </div>
    </PanelSection>
  </div>
</template>

<style scoped>
.view-stack {
  display: grid;
}

.desk-group-list {
  display: grid;
  gap: 12px;
}

.desk-group {
  border: 1px solid rgba(79, 57, 32, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.desk-group-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border: none;
  background: transparent;
  font: inherit;
  color: #4d3c27;
  cursor: pointer;
  text-align: left;
}

.desk-group-head:hover {
  background: rgba(244, 235, 218, 0.8);
}

.desk-group-title {
  display: grid;
  gap: 2px;
  font-weight: 600;
}

.desk-group-title small {
  font-weight: 400;
  color: #8a755a;
  font-size: 0.8rem;
}

.desk-group-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.desk-count {
  padding: 5px 10px;
  border-radius: 999px;
  background: #efe2ca;
  color: #7e6038;
  font-size: 0.76rem;
  white-space: nowrap;
}

.desk-caret {
  font-size: 0.8rem;
  color: #82684b;
}

.desk-caret--open {
  color: #5d4322;
  font-weight: 600;
}

.desk-group-body {
  padding: 4px 18px 18px;
  border-top: 1px dashed rgba(79, 57, 32, 0.18);
}
</style>
