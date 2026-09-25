import { createRouter, createWebHistory } from 'vue-router'

import DashboardView from '../views/DashboardView.vue'
import BatchLibraryView from '../views/BatchLibraryView.vue'
import RepairDeskView from '../views/RepairDeskView.vue'
import TaskBoardView from '../views/TaskBoardView.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
  },
  {
    path: '/batches',
    name: 'batches',
    component: BatchLibraryView,
  },
  {
    path: '/desk',
    name: 'desk',
    component: RepairDeskView,
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: TaskBoardView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
