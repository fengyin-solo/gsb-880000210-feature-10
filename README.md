# solo-8800002

一个基于 Vite + Vue 3 的纯前端小众业务示例项目，主题是古籍虫蛀修复批次管理。

## 开发

```bash
npm install
npm run dev
```

`vite.config.js` 已显式配置 `server.open = false`，启动开发服务时不会自动打开浏览器。

## 构建

```bash
npm run build
```

## 修复备注

处理备注集中在 `src/stores/repairRemarkStoreCore.js`（纯 JS 存储核心）+
`src/composables/useRepairRemarks.js`（响应式封装），任务清单与修复工作台共用一个单例。

- 每条备注带时间、修复师、关联工序；任务清单原有说明一次性植入为「历史备注 · 只读」。
- 空备注、修复师/工序缺失、乐观版本冲突、与同对象上一条完全相同的保存都不会生成记录。
- 成功保存即写入 `localStorage`，刷新后读到最后一次有效内容；写盘失败保留原版本。
- 存储核心规则测试：

```bash
npm run test:store
```
