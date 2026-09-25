<script setup>
import { riskMeta } from '../../utils/restorationFormatters'

defineProps({
  rows: {
    type: Array,
    required: true,
  },
  selectedId: {
    type: String,
    default: '',
  },
  remarkCounts: {
    type: Object,
    default: () => ({}),
  },
  selectable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])
</script>

<template>
  <div class="task-table">
    <div class="task-row task-head">
      <span>对象</span>
      <span>阶段</span>
      <span>风险</span>
      <span>负责人</span>
      <span>备注</span>
      <span>说明</span>
    </div>
    <div
      v-for="row in rows"
      :key="row.id"
      :class="[
        'task-row',
        selectable && 'task-row--clickable',
        selectable && selectedId === row.id && 'task-row--active',
      ]"
      :tabindex="selectable ? 0 : undefined"
      :role="selectable ? 'button' : undefined"
      @click="selectable && emit('select', row.id)"
      @keydown.enter="selectable && emit('select', row.id)"
    >
      <span class="task-title">{{ row.title }}</span>
      <span>{{ row.stage }}</span>
      <span :class="['risk-tag', `risk-tag--${riskMeta(row.risk).tone}`]">
        {{ riskMeta(row.risk).label }}
      </span>
      <span>{{ row.owner }}</span>
      <span class="remark-count">{{ remarkCounts[row.id] ?? 0 }} 条</span>
      <span class="task-note">{{ row.note }}</span>
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
  grid-template-columns: 1.2fr 0.8fr 0.6fr 0.7fr 0.6fr 1.4fr;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.72);
}

.task-row + .task-row {
  border-top: 1px solid rgba(79, 57, 32, 0.08);
}

.task-row--clickable {
  cursor: pointer;
}

.task-row--clickable:hover {
  background: rgba(244, 235, 218, 0.9);
}

.task-row--active {
  background: #efe2ca;
  box-shadow: inset 3px 0 0 #5d4322;
}

.task-row:focus-visible {
  outline: 2px solid rgba(93, 67, 34, 0.5);
  outline-offset: -2px;
}

.task-head {
  background: #efe1c6;
  color: #775936;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.76rem;
}

.remark-count {
  color: #7e6038;
  font-size: 0.86rem;
  white-space: nowrap;
}

.task-note {
  color: #6a5439;
  font-size: 0.9rem;
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

@media (max-width: 900px) {
  .task-table {
    overflow-x: auto;
  }

  .task-row {
    min-width: 860px;
  }
}
</style>
