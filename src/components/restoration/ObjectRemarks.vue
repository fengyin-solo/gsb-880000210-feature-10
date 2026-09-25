<script setup>
import { computed } from 'vue'

import RemarkList from './RemarkList.vue'
import RemarkComposer from './RemarkComposer.vue'
import { useRepairRemarks } from '../../composables/useRepairRemarks'
import { defaultProcessForStage } from '../../utils/restorationFormatters'

const props = defineProps({
  target: {
    type: Object,
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
  showHeader: {
    type: Boolean,
    default: true,
  },
})

const { remarksFor, countFor } = useRepairRemarks()

const remarks = computed(() => remarksFor(props.target.id))
const count = computed(() => countFor(props.target.id))
const defaultProcess = computed(() => defaultProcessForStage(props.target.stage))
</script>

<template>
  <section class="object-remarks">
    <header v-if="showHeader" class="object-remarks-head">
      <div>
        <h4>{{ target.title }}</h4>
        <small>{{ target.stage }}</small>
      </div>
      <span class="remark-count-badge">备注 {{ count }} 条</span>
    </header>

    <RemarkList :remarks="remarks" />

    <div class="object-remarks-divider">新增处理备注</div>
    <RemarkComposer
      :key="target.id"
      :target-id="target.id"
      :version="count"
      :repairers="repairers"
      :processes="processes"
      :default-repairer="target.owner"
      :default-process="defaultProcess"
    />
  </section>
</template>

<style scoped>
.object-remarks {
  display: grid;
  gap: 12px;
}

.object-remarks-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.object-remarks-head h4 {
  margin: 0;
  font-size: 1rem;
  color: #4d3c27;
}

.object-remarks-head small {
  color: #8a755a;
}

.remark-count-badge {
  padding: 5px 10px;
  border-radius: 999px;
  background: #efe2ca;
  color: #7e6038;
  font-size: 0.76rem;
  white-space: nowrap;
}

.object-remarks-divider {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed rgba(79, 57, 32, 0.18);
  font-size: 0.8rem;
  color: #82684b;
}
</style>
