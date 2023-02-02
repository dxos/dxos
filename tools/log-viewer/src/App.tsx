import { readdirSync, watch } from 'node:fs'
import { join } from 'node:path'
import { useEffect, useState } from 'react'
import { LogViewer } from './LogViewer'

const logsDir = `${process.env.HOME}/.dxlog`

export const App = () => {
  const [logs, setLogs] = useState<string[]>([])
  const [selectedLog, setSelectedLog] = useState<string>()
  useEffect(() => {
    setLogs(readdirSync(logsDir).reverse())

    const watcher = watch(logsDir, () => {
      setLogs(readdirSync(logsDir).reverse())
    })
    return () => watcher.close();
  }, [])

  if (selectedLog) return (
    <LogViewer logFile={join(logsDir, selectedLog)} />
  )

  return (
    <ul>
      {logs.map((log) => (
        <li key={log} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
          {log} ({getTimeAgo(log)} ago)
        </li>
      ))}
    </ul>
  )
}

const getTimeAgo = (filename: string) => {
  try {
    const date = new Date(filename.slice(0, -4))
    const diff = Date.now() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    if (seconds > 0) return `${seconds}s`
    return 'just now'
  } catch (err) {
    return ''
  }
}