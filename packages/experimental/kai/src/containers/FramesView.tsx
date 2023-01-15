import React, { useState } from 'react'
import { useQuery, withReactor } from "@dxos/react-client"
import { Frame } from '@dxos/framebox'
import { useSpace } from "../hooks"
import { deleted, id, TextObject } from '@dxos/echo-schema'
import { CardRow } from '../components'
import { Button, getSize, mx } from '@dxos/react-components'
import { Input } from '../components'
import { XCircle } from 'phosphor-react'

export const FramesView = withReactor(() => {
  const [selected, setSelected] = useState<Frame | undefined>(undefined)
  return (
    <div>
      <FrameList selected={selected} onSelected={setSelected} />
    </div>
  )
})

export type FrameListProps = {
  selected: Frame | undefined
  onSelected: (frame: Frame) => void
}

export const FrameList = withReactor(({ selected, onSelected }: FrameListProps) => {
  const { space } = useSpace()
  const frames = useQuery(space, Frame.filter())
  const [newFrame, setNewFrame] = useState<string>('')

  return (
    <div>
      {frames.map(frame => (
        <CardRow
          action={
            (
              <Button className='text-gray-300' onClick={() => space.experimental.db.delete(frame)}>
                <XCircle className={mx(getSize(6), 'hover:text-red-400')} />
              </Button>
            )
          }
          header={
            <Input
              onFocus={() => onSelected(frame)}
              className={mx('w-full outline-0', frame[deleted] && 'text-red-300', selected === frame && 'text-blue-300')}
              spellCheck={false}
              value={frame.name}
              placeholder='Enter text'
              onChange={value => { frame.name = value; }}
            />
          }
        />
      ))}
      <CardRow
        action={
          (
            <Button className='text-gray-300' onClick={() => {
              space.experimental.db.save(new Frame({
                name: newFrame,
                content: new TextObject()
              }))
              setNewFrame('')
            }}>
              Create
            </Button>
          )
        }
        header={
          <input
            className='w-full outline-0'
            spellCheck={false}
            value={newFrame}
            placeholder='Enter text'
            onChange={(e) => setNewFrame(e.target.value)}
          />
        }
      />
    </div>
  )
})