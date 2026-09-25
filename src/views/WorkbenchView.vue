<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PanelSection from '../components/common/PanelSection.vue'
import NoteThread from '../components/restoration/NoteThread.vue'
import NoteComposer from '../components/restoration/NoteComposer.vue'
import { riskMeta } from '../utils/restorationFormatters'
import {
  useRestorationNotes,
  reloadFromStorage,
  simulateExternalChange,
  setStorageFailure,
} from '../composables/useRestorationNotes'

const route = useRoute()
const router = useRouter()

const {
  objects,
  objectById,
  threadFor,
  notesFor,
  noteCountFor,
  latestNoteFor,
} = useRestorationNotes()

const ALL = 'all'
const selectedId = computed(() => {
  const value = route.query.object
  return objects.some((item) => item.id === value) ? value : objects[0]?.id
})

const selectedObject = computed(() => objectById(selectedId.value))
const selectedThread = computed(() => threadFor(selectedId.value))

function select(id) {
  router.replace({ query: { ...route.query, object: id } })
}

// 原型演示开关：制造"别处已修改"的版本冲突场景
function triggerConflict() {
  simulateExternalChange(selectedId.value)
}

// 原型演示开关：让下一次写入失败，验证失败保留原版本（失败后自动复位）
const failNextSave = ref(false)
function toggleFailNextSave(event) {
  failNextSave.value = event.target.checked
  setStorageFailure(event.target.checked)
}

function noteSaved(result) {
  // 无论成功失败都复位演示开关，避免后续保存一直被模拟故障拦住
  if (failNextSave.value && !result.ok) {
    failNextSave.value = false
    setStorageFailure(false)
  }
}

function refreshStore() {
  reloadFromStorage()
}
</script>

<template>
  <div class="view-stack">
    <PanelSection title="修复工作台" badge="按对象收拢备注">
      <div v-if="selectedObject" class="workbench">
        <aside class="object-list">
          <button
            type="button"
            :class="['object-item', { 'object-item--active': route.query.object === ALL }]"
            @click="select(ALL)"
          >
            <span class="object-name">全部对象</span>
            <span class="object-meta">收拢查看</span>
          </button>
          <button
            v-for="object in objects"
            :key="object.id"
            type="button"
            :class="['object-item', { 'object-item--active': selectedId === object.id && route.query.object !== ALL }]"
            @click="select(object.id)"
          >
            <span class="object-name">{{ object.title }}</span>
            <span class="object-meta">
              <span :class="['risk-dot', `risk-dot--${riskMeta(object.risk).tone}`]" />
              {{ object.stage }} · {{ noteCountFor(object.id) }} 条备注
            </span>
          </button>
        </aside>

        <section class="object-detail">
          <template v-if="route.query.object === ALL">
            <details
              v-for="object in objects"
              :key="object.id"
              class="group-block"
              open
            >
              <summary class="group-head">
                <span class="object-name">{{ object.title }}</span>
                <span class="group-sub">
                  {{ object.id }} · {{ object.stage }} · 负责人 {{ object.owner }}
                  · {{ noteCountFor(object.id) }} 条备注
                </span>
              </summary>
              <NoteThread :notes="notesFor(object.id)" compact class="group-thread" />
            </details>
          </template>

          <template v-else>
            <header class="detail-head">
              <div>
                <h3 class="detail-title">{{ selectedObject.title }}</h3>
                <p class="detail-sub">
                  批次 {{ selectedObject.id }} · 页码 {{ selectedObject.pages }}
                  · {{ selectedObject.stage }} · 负责人 {{ selectedObject.owner }}
                </p>
              </div>
              <strong class="note-count">{{ noteCountFor(selectedObject.id) }} 条备注</strong>
            </header>

            <p class="latest-line">
              <span class="latest-label">最新说明：</span>
              <template v-if="latestNoteFor(selectedObject.id)">
                {{ latestNoteFor(selectedObject.id).content }}
              </template>
              <span v-else>暂无</span>
            </p>

            <NoteThread :notes="notesFor(selectedObject.id)" />

            <NoteComposer
              :key="selectedObject.id"
              :object="selectedObject"
              :version="selectedThread?.version ?? 1"
              @saved="noteSaved"
            />
          </template>
        </section>
      </div>

      <footer class="demo-tools">
        <span>原型验证：</span>
        <button type="button" @click="triggerConflict">模拟别处已修改</button>
        <label>
          <input type="checkbox" :checked="failNextSave" @change="toggleFailNextSave" />
          下次保存写入失败
        </label>
        <button type="button" @click="refreshStore">模拟刷新重读</button>
      </footer>
    </PanelSection>
  </div>
</template>

<style scoped>
.workbench {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 18px;
}

.object-list {
  display: grid;
  gap: 8px;
  align-content: start;
}

.object-item {
  text-align: left;
  font: inherit;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(79, 57, 32, 0.12);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  display: grid;
  gap: 4px;
}

.object-item--active {
  background: #5d4322;
  border-color: #5d4322;
}

.object-item--active .object-name,
.object-item--active .object-meta {
  color: #fff8eb;
}

.object-name {
  font-weight: 600;
  color: #3a2d1c;
}

.object-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #82684b;
}

.risk-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}

.risk-dot--high {
  background: #913d2f;
}

.risk-dot--medium {
  background: #8b6314;
}

.risk-dot--low {
  background: #366338;
}

.object-detail {
  display: grid;
  gap: 14px;
  align-content: start;
  min-width: 0;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.detail-title {
  margin: 0;
  font-size: 1.12rem;
}

.detail-sub,
.group-sub {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #82684b;
}

.note-count {
  white-space: nowrap;
  font-size: 0.86rem;
  padding: 6px 12px;
  border-radius: 999px;
  background: #efe2ca;
  color: #7e6038;
}

.latest-line {
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(239, 226, 202, 0.5);
  font-size: 0.9rem;
  color: #4a3a24;
}

.latest-label {
  color: #7e6038;
}

.group-block {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(79, 57, 32, 0.08);
}

.group-head {
  cursor: pointer;
  margin-bottom: 10px;
}

.group-head .object-name {
  margin-right: 10px;
}

.group-thread {
  margin-top: 8px;
}

.demo-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed rgba(79, 57, 32, 0.2);
  font-size: 0.8rem;
  color: #82684b;
}

.demo-tools button {
  font: inherit;
  font-size: 0.8rem;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(79, 57, 32, 0.3);
  background: transparent;
  color: #5d4322;
  cursor: pointer;
}

.demo-tools label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 900px) {
  .workbench {
    grid-template-columns: 1fr;
  }

  .object-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
