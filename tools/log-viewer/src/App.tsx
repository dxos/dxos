import { readdirSync, watch } from 'node:fs'
import { join } from 'node:path'
import { useEffect, useState } from 'react'
import { LogViewer } from './LogViewer'

const logsDir = `${process.env.HOME}/.dxlog`

export const App = () => {
  const [logs, setLogs] = useState<string[]>([])
  const [selectedLog, setSelectedLog] = useState<string>()
  useEffect(() => {
    setLogs(readdirSync(logsDir))

    const watcher = watch(logsDir, () => {
      setLogs(readdirSync(logsDir))
    })
    return () => watcher.close();
  }, [])

  if (selectedLog) return (
    <LogViewer logFile={join(logsDir, selectedLog)} />
  )

  return (
    <ul>
      {logs.map((log) => (
        <li key={log} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>{log}</li>
      ))}
    </ul>
  )
}