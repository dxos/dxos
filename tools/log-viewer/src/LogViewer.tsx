import { readFileSync } from "node:fs"
import { basename } from "node:path"
import { useMemo, useState } from "react"
import styled from "styled-components"
import { LogLevel, shouldLog } from "@dxos/log"
import { parseFilter } from "@dxos/log"

export type LogViewerProps = {
  logFile: string
}

export const LogViewer = ({ logFile }: LogViewerProps) => {
  const [filter, setFilter] = useState('debug')
  const [entries] = useState(readFileSync(logFile, { encoding: 'utf-8' }).split('\n').filter(line => line.length > 0).map(line => JSON.parse(line)))

  const filteredEntries = useMemo(() => entries.filter(entry => shouldLog({ filters: parseFilter(filter) } as any, entry.level, entry.meta.path)), [filter])

  return (
    <div>
      <Filter type="text" onBlur={e => setFilter(e.target.value)} />
      <ul>
        {filteredEntries.map((entry, idx) => (
          <Row key={idx}>
            <Filename href={`vscode://file${entry.meta.file}:${entry.meta.line}`}>{basename(entry.meta.file)}:{entry.meta.line}</Filename>
            <div style={{ color: LEVEL_COLORS[entry.level] }}>{LogLevel[entry.level]}</div>
            <Message>{entry.message}</Message>
            <Context>{JSON.stringify(entry.context, null, 2)}</Context>
          </Row>
        ))}
      </ul>  
    </div>
  )
}

const LEVEL_COLORS: Record<string, string> = {
  [LogLevel.DEBUG]: 'gray',
  [LogLevel.INFO]: 'white',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red'
};

const Filter = styled.input`
  width: 100%;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: 0.5fr 60px 2fr 1fr;
  grid-gap: 10px;
`

const Filename = styled.a`
  color: #8c8c8c;
`

const Message = styled.div`
  overflow-x: auto;
  white-space: pre;
`

const Context = styled.pre`
  overflow-x: hidden;
`
