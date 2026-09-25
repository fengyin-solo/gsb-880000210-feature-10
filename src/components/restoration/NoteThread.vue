<script setup>
import { formatNoteTime } from '../../utils/restorationFormatters'

defineProps({
  notes: {
    type: Array,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <ol v-if="notes.length" :class="['note-list', { 'note-list--compact': compact }]">
    <li v-for="note in notes" :key="note.id" class="note-item">
      <div class="note-meta">
        <span class="note-time">{{ formatNoteTime(note.createdAt) }}</span>
        <span class="note-author">{{ note.author || '未署名修复师' }}</span>
        <span v-if="note.process" class="note-process">{{ note.process }}</span>
        <span v-if="note.legacy" class="note-legacy" :title="`来源：${note.source}，只读保留`">
          旧备注 · 只读
        </span>
      </div>
      <p class="note-content">{{ note.content }}</p>
    </li>
  </ol>
  <p v-else class="note-empty">还没有处理备注。</p>
</template>

<style scoped>
.note-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.note-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(79, 57, 32, 0.08);
}

.note-item:has(.note-legacy) {
  background: rgba(239, 226, 202, 0.45);
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 0.78rem;
  color: #82684b;
}

.note-time {
  font-variant-numeric: tabular-nums;
}

.note-author {
  font-weight: 600;
  color: #5d4322;
}

.note-process {
  padding: 2px 9px;
  border-radius: 999px;
  background: #efe2ca;
  color: #7e6038;
}

.note-legacy {
  padding: 2px 9px;
  border-radius: 999px;
  background: #e4d8c2;
  color: #6d5837;
  letter-spacing: 0.04em;
}

.note-content {
  margin: 7px 0 0;
  color: #4a3a24;
  white-space: pre-wrap;
}

.note-list--compact .note-item {
  padding: 10px 12px;
}

.note-empty {
  margin: 0;
  color: #8a7659;
  font-size: 0.9rem;
}
</style>
