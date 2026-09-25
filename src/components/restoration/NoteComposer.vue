<script setup>
import { ref, watch } from 'vue'
import {
  restorationProcesses,
  defaultProcessForStage,
} from '../../utils/noteThread'
import { saveNote, NOTE_ERRORS } from '../../composables/useRestorationNotes'

const emit = defineEmits(['saved'])

const props = defineProps({
  object: {
    type: Object,
    required: true,
  },
  version: {
    type: Number,
    required: true,
  },
})

const content = ref('')
const author = ref(props.object.owner)
const process = ref(defaultProcessForStage(props.object.stage))
const saving = ref(false)
const message = ref('')
const messageTone = ref('')
const conflicted = ref(false)

// 进入对象时记录的基准版本；其他标签页改动后该快照过期，保存即触发版本冲突
let baseVersion = props.version

function resetForm() {
  content.value = ''
  author.value = props.object.owner
  process.value = defaultProcessForStage(props.object.stage)
  message.value = ''
  conflicted.value = false
}

watch(
  () => props.object.id,
  () => {
    baseVersion = props.version
    resetForm()
  },
)

function errorText(error) {
  const map = {
    [NOTE_ERRORS.EMPTY]: '备注内容为空，未生成记录。',
    [NOTE_ERRORS.DUPLICATE]:
      '与最后一条备注的修复师、工序和内容完全相同，未重复保存。',
    [NOTE_ERRORS.VERSION_CONFLICT]:
      '该对象的备注已在别处被修改，版本不一致；请先重新载入再保存。',
    [NOTE_ERRORS.UNKNOWN_OBJECT]: '未找到对应修复对象，未生成记录。',
    PERSIST_FAILED: '本地保存失败，已保留原版本，可调整后重试。',
  }
  return map[error] ?? '保存未成功，已保留原版本。'
}

async function submit() {
  saving.value = true
  message.value = ''

  // 留出微小延迟，避免双击按钮触发连续保存
  await new Promise((resolve) => setTimeout(resolve, 60))

  const result = saveNote(
    props.object.id,
    {
      content: content.value,
      author: author.value,
      process: process.value,
    },
    baseVersion,
  )

  saving.value = false
  emit('saved', result)

  if (result.ok) {
    baseVersion = result.threads[props.object.id].version
    conflicted.value = false
    content.value = ''
    messageTone.value = 'success'
    message.value = '备注已保存并按对象归档。'
    return
  }

  // 任何失败都不清空表单，保留原版本内容供修改重试
  messageTone.value = 'error'
  message.value = errorText(result.error)
  conflicted.value = result.error === NOTE_ERRORS.VERSION_CONFLICT
}

// 冲突后重新载入：列表已是最新内容，只需把基准版本对齐
function reloadLatest() {
  baseVersion = props.version
  conflicted.value = false
  message.value = ''
}
</script>

<template>
  <form class="note-composer" @submit.prevent="submit">
    <div class="composer-fields">
      <label class="field">
        <span>修复师</span>
        <input v-model="author" type="text" :placeholder="object.owner" />
      </label>
      <label class="field">
        <span>关联工序</span>
        <select v-model="process">
          <option v-for="step in restorationProcesses" :key="step" :value="step">
            {{ step }}
          </option>
        </select>
      </label>
    </div>
    <label class="field">
      <span>处理备注</span>
      <textarea
        v-model="content"
        rows="3"
        placeholder="记录本次处理内容；旧备注只读保留，不会被覆盖。"
      />
    </label>
    <div class="composer-actions">
      <button class="save-btn" type="submit" :disabled="saving">
        {{ saving ? '保存中…' : '追加备注' }}
      </button>
      <button v-if="conflicted" type="button" class="reload-btn" @click="reloadLatest">
        重新载入最新版本
      </button>
      <span v-if="message" :class="['composer-message', `composer-message--${messageTone}`]">
        {{ message }}
      </span>
    </div>
  </form>
</template>

<style scoped>
.note-composer {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(239, 226, 202, 0.4);
  border: 1px solid rgba(79, 57, 32, 0.1);
}

.composer-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: grid;
  gap: 5px;
  font-size: 0.82rem;
  color: #6d5837;
}

.field input,
.field select,
.field textarea {
  font: inherit;
  padding: 9px 11px;
  border-radius: 10px;
  border: 1px solid rgba(79, 57, 32, 0.18);
  background: rgba(255, 255, 255, 0.85);
  color: #3a2d1c;
  resize: vertical;
}

.composer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.save-btn,
.reload-btn {
  font: inherit;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #5d4322;
  cursor: pointer;
}

.save-btn {
  background: #5d4322;
  color: #fff8eb;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.reload-btn {
  background: transparent;
  color: #5d4322;
}

.composer-message {
  font-size: 0.82rem;
}

.composer-message--error {
  color: #913d2f;
}

.composer-message--success {
  color: #366338;
}

@media (max-width: 640px) {
  .composer-fields {
    grid-template-columns: 1fr;
  }
}
</style>
