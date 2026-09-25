<script setup>
import { formatRemarkTime } from '../../utils/restorationFormatters'

defineProps({
  remarks: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <div class="remark-list">
    <p v-if="remarks.length === 0" class="remark-empty">暂无处理备注。</p>
    <template v-else>
      <article
        v-for="remark in remarks"
        :key="remark.id"
        :class="['remark-item', { 'remark-item--legacy': remark.legacy }]"
      >
        <div class="remark-meta">
          <span class="remark-who">{{ remark.repairer }}</span>
          <span class="remark-dot">·</span>
          <span class="remark-process">工序：{{ remark.process }}</span>
          <span class="remark-dot">·</span>
          <time class="remark-time">{{ formatRemarkTime(remark.time) }}</time>
          <span v-if="remark.legacy" class="remark-legacy-tag">历史备注 · 只读</span>
        </div>
        <p class="remark-content">{{ remark.content }}</p>
      </article>
    </template>
  </div>
</template>

<style scoped>
.remark-list {
  display: grid;
  gap: 10px;
}

.remark-empty {
  margin: 0;
  color: #8a755a;
  font-size: 0.9rem;
  padding: 10px 0;
}

.remark-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(79, 57, 32, 0.1);
}

.remark-item--legacy {
  background: rgba(243, 235, 220, 0.8);
  border-style: dashed;
}

.remark-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #82684b;
}

.remark-who {
  font-weight: 600;
  color: #5d4322;
}

.remark-dot {
  opacity: 0.5;
}

.remark-content {
  margin: 8px 0 0;
  color: #4d3c27;
  font-size: 0.92rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.remark-legacy-tag {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e6dcc8;
  color: #7e6038;
  font-size: 0.7rem;
}
</style>
