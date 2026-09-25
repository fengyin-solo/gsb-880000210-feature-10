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

/** 备注时间：YYYY-MM-DD HH:mm（无法解析时原样返回，旧数据不丢） */
export function formatNoteTime(isoText) {
  if (!isoText) return ''
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) return isoText

  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
