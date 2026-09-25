<script setup>
import { computed, ref } from 'vue'

import PanelSection from '../components/common/PanelSection.vue'
import TaskTable from '../components/restoration/TaskTable.vue'
import ObjectRemarks from '../components/restoration/ObjectRemarks.vue'
import { restorationProcesses, restorationTasks } from '../data/restorationData'
import { useRepairRemarks } from '../composables/useRepairRemarks'

const { countByTarget } = useRepairRemarks()

// 当前选中的修复对象；切换对象后右侧备注立即跟随，两处数量与说明来自同一存储
const selectedId = ref(restorationTasks[0]?.id ?? '')
const selectedTask = computed(
  () => restorationTasks.find((task) => task.id === selectedId.value) ?? null,
)

const repairers = [...new Set(restorationTasks.map((task) => task.owner))]
</script>

<template>
  <div class="view-stack">
    <PanelSection title="任务清单" badge="点选对象查看处理备注">
      <div class="task-board">
        <TaskTable
          :rows="restorationTasks"
          :selected-id="selectedId"
          :remark-counts="countByTarget"
          selectable
          @select="selectedId = $event"
        />

        <aside class="task-detail">
          <ObjectRemarks
            v-if="selectedTask"
            :key="selectedTask.id"
            :target="selectedTask"
            :repairers="repairers"
            :processes="restorationProcesses"
          />
        </aside>
      </div>
    </PanelSection>
  </div>
</template>

<style scoped>
.view-stack {
  display: grid;
}

.task-board {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.task-detail {
  position: sticky;
  top: 20px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(244, 235, 218, 0.55);
  border: 1px solid rgba(109, 80, 40, 0.1);
}

@media (max-width: 1080px) {
  .task-board {
    grid-template-columns: 1fr;
  }

  .task-detail {
    position: static;
  }
}
</style>
