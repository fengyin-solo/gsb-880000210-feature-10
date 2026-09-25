<script setup>
import { ref, watch } from 'vue'

import { useRepairRemarks } from '../../composables/useRepairRemarks'
import { remarkErrorHint } from '../../utils/restorationFormatters'

const props = defineProps({
  targetId: {
    type: String,
    required: true,
  },
  // 录入方持有的备注版本（通常等于当前备注数量），用于乐观锁冲突检测
  version: {
    type: Number,
    required: true,
  },
  repairers: {
    type: Array,
    required: true,
  },
  processes: {
    type: Array,
    required: true,
  },
  defaultRepairer: {
    type: String,
    default: '',
  },
  defaultProcess: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['saved'])

const { addRemark } = useRepairRemarks()

const content = ref('')
const repairer = ref(props.defaultRepairer)
const process = ref(props.defaultProcess)
const feedback = ref({ type: '', message: '' })
// 切换对象后可能已被别处更新，用工作副本版本承接重基
let baseVersion = props.version

watch(
  () => props.targetId,
  () => {
    content.value = ''
    repairer.value = props.defaultRepairer
    process.value = props.defaultProcess
    feedback.value = { type: '', message: '' }
    baseVersion = props.version
  },
)
watch(
  () => props.version,
  (value) => {
    baseVersion = value
  },
)

function submit() {
  const result = addRemark({
    targetId: props.targetId,
    content: content.value,
    repairer: repairer.value,
    process: process.value,
    expectedVersion: baseVersion,
  })

  if (result.ok) {
    feedback.value = {
      type: 'success',
      message: `已记录（${result.remark.repairer} · ${result.remark.process}）`,
    }
    content.value = ''
    baseVersion += 1
    emit('saved', result.remark)
    return
  }

  feedback.value = { type: 'error', message: remarkErrorHint(result.error) }
  if (result.error === 'CONFLICT') {
    // 以最新版本为基线，保留已输入内容供修复师修改后重试
    baseVersion = props.version
  }
}
</script>

<template>
  <form class="remark-composer" @submit.prevent="submit">
    <textarea
      v-model="content"
      class="remark-input"
      rows="3"
      placeholder="记录本次处理说明（空内容不会保存）"
    />
    <div class="remark-fields">
      <label class="remark-field">
        <span>修复师</span>
        <select v-model="repairer">
          <option value="" disabled>请选择</option>
          <option v-for="name in repairers" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </label>
      <label class="remark-field">
        <span>关联工序</span>
        <select v-model="process">
          <option value="" disabled>请选择</option>
          <option v-for="step in processes" :key="step" :value="step">
            {{ step }}
          </option>
        </select>
      </label>
      <button type="submit" class="remark-submit">保存备注</button>
    </div>
    <p
      v-if="feedback.message"
      :class="['remark-feedback', `remark-feedback--${feedback.type}`]"
    >
      {{ feedback.message }}
    </p>
  </form>
</template>

<style scoped>
.remark-composer {
  display: grid;
  gap: 10px;
}

.remark-input {
  width: 100%;
  resize: vertical;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(79, 57, 32, 0.18);
  background: rgba(255, 255, 255, 0.9);
  color: #4d3c27;
  font: inherit;
  line-height: 1.5;
}

.remark-input:focus {
  outline: 2px solid rgba(93, 67, 34, 0.25);
  border-color: rgba(93, 67, 34, 0.45);
}

.remark-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}

.remark-field {
  display: grid;
  gap: 4px;
  font-size: 0.78rem;
  color: #82684b;
}

.remark-field select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(79, 57, 32, 0.18);
  background: rgba(255, 255, 255, 0.9);
  color: #4d3c27;
  font: inherit;
}

.remark-submit {
  margin-left: auto;
  padding: 9px 18px;
  border: none;
  border-radius: 12px;
  background: #5d4322;
  color: #fff8eb;
  font: inherit;
  cursor: pointer;
}

.remark-submit:hover {
  background: #6f5030;
}

.remark-feedback {
  margin: 0;
  font-size: 0.82rem;
}

.remark-feedback--success {
  color: #366338;
}

.remark-feedback--error {
  color: #913d2f;
}
</style>
