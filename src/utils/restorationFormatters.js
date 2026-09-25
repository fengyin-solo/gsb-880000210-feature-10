export function riskMeta(risk) {
  const map = {
    high: {
      label: '高',
      tone: 'high',
    },
    medium: {
      label: '中',
      tone: 'medium',
    },
    low: {
      label: '低',
      tone: 'low',
    },
  }

  return map[risk] ?? map.low
}

// 备注时间统一展示为「YYYY-MM-DD HH:mm」；存储值本身不带时区后缀，按本地时间解析
export function formatRemarkTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 阶段到默认关联工序的映射，新增备注时预选，修复师仍可改选其它工序
export function defaultProcessForStage(stage) {
  const map = {
    补纸前: '固色处理',
    控湿中: '控湿处理',
    归档前: '透明托裱',
  }
  return map[stage] ?? ''
}

// 保存失败原因映射为可展示的提示
export function remarkErrorHint(error) {
  const map = {
    EMPTY: '备注内容为空，未生成记录。',
    MISSING_FIELD: '请填写修复师并选择关联工序。',
    CONFLICT: '备注已被别处更新，请刷新后基于最新版本再保存。',
    DUPLICATE: '与上一条备注内容完全相同，无需重复记录。',
    PERSIST: '保存失败，已保留原版本，请稍后重试。',
  }
  return map[error] ?? '保存失败，已保留原版本。'
}
