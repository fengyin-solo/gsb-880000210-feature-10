import {
  buildLegacyRemarks,
  createRepairRemarkStore,
} from './repairRemarkStoreCore'
import { restorationTasks } from '../data/restorationData'

// 全局单例：任务清单与修复工作台共用同一份数据，两处数量与说明始终一致
export const repairRemarkStore = createRepairRemarkStore({
  seeds: buildLegacyRemarks(restorationTasks),
})
