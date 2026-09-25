<script setup>
import { useRouter } from 'vue-router'
import { riskMeta } from '../../utils/restorationFormatters'
import { useRestorationNotes } from '../../composables/useRestorationNotes'

defineProps({
  rows: {
    type: Array,
    required: true,
  },
})

const router = useRouter()
const { noteCountFor, latestNoteFor } = useRestorationNotes()

function openObject(objectId) {
  router.push({ path: '/workbench', query: { object: objectId } })
}
</script>

<template>
  <div class="task-table">
    <div class="task-row task-head">
      <span>对象</span>
      <span>阶段</span>
      <span>风险</span>
      <span>负责人</span>
      <span>备注</span>
      <span>最新说明</span>
      <span></span>
    </div>
    <div
      v-for="row in rows"
      :key="row.objectId"
      class="task-row"
    >
      <span>{{ row.title }}</span>
      <span>{{ row.stage }}</span>
      <span :class="['risk-tag', `risk-tag--${riskMeta(row.risk).tone}`]">
        {{ riskMeta(row.risk).label }}
      </span>
      <span>{{ row.owner }}</span>
      <span class="note-count">{{ noteCountFor(row.objectId) }} 条</span>
      <span class="note-text">
        <template v-if="latestNoteFor(row.objectId)">
          {{ latestNoteFor(row.objectId).content }}
        </template>
        <span v-else class="note-empty">暂无备注</span>
      </span>
      <span>
        <button type="button" class="enter-btn" @click="openObject(row.objectId)">
          进入工作台
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.task-table {
  overflow: hidden;
  border: 1px solid rgba(79, 57, 32, 0.1);
  border-radius: 18px;
}

.task-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.6fr 0.7fr 0.6fr 1.3fr 0.9fr;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.72);
}

.task-row + .task-row {
  border-top: 1px solid rgba(79, 57, 32, 0.08);
}

.task-head {
  background: #efe1c6;
  color: #775936;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.76rem;
}

.risk-tag {
  display: inline-flex;
  justify-content: center;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
}

.risk-tag--high {
  background: #efd0c9;
  color: #913d2f;
}

.risk-tag--medium {
  background: #f6e5b9;
  color: #8b6314;
}

.risk-tag--low {
  background: #d9ead9;
  color: #366338;
}

.note-count {
  color: #5d4322;
  font-weight: 600;
  white-space: nowrap;
}

.note-text {
  color: #4a3a24;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-empty {
  color: #9a8768;
}

.enter-btn {
  font: inherit;
  font-size: 0.82rem;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid #5d4322;
  background: transparent;
  color: #5d4322;
  cursor: pointer;
  white-space: nowrap;
}

.enter-btn:hover {
  background: #5d4322;
  color: #fff8eb;
}

@media (max-width: 900px) {
  .task-table {
    overflow-x: auto;
  }

  .task-row {
    min-width: 900px;
  }
}
</style>
