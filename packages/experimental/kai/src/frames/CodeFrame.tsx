//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { data, TextObject } from '@dxos/echo-schema';
import { compile, Editor, Frame } from '@dxos/framebox';
import { useQuery, withReactor } from '@dxos/react-client';

import { EmbeddedFrame } from '../frame-container';
import { useSpace } from '../hooks';

const CodeFrame = withReactor(() => {
  const [selected, setSelected] = useState<Frame | undefined>(undefined);

  useEffect(() => {
    const id = setInterval(async () => {
      if (selected) {
        await compile(selected);
        console.log(selected[data]);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [selected]);

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <FrameList selected={selected} onSelected={setSelected} />
      {selected?.content && <Editor document={selected?.content} />}
      {selected?.compiled && <EmbeddedFrame frame={selected} />}
    </div>
  );
});

export default CodeFrame;

export type FrameListProps = {
  selected: Frame | undefined;
  onSelected: (frame: Frame) => void;
};

const FrameList = withReactor(({ selected, onSelected }: FrameListProps) => {
  const space = useSpace();
  const frames = useQuery(space, Frame.filter());
  const [newFrame, setNewFrame] = useState<string>('');

  useEffect(() => {
    if (frames.length === 0) {
      setTimeout(async () => {
        const frame = new Frame({
          name: 'Example',
          content: new TextObject()
        });
        await space.experimental.db.save(frame);
        frame.content.doc!.getText('monaco').insert(0, EXAMPLE);
        onSelected(frame);
      });
    } else {
      onSelected(frames[0]);
    }
  }, []);

  return (
    <div>
      {/* {frames.map((frame) => (
        <CardRow
          key={frame[id]}
          action={
            <Button className='text-gray-300' onClick={() => space.experimental.db.delete(frame)}>
              <XCircle className={mx(getSize(6), 'hover:text-red-400')} />
            </Button>
          }
          header={
            <Input
              onFocus={() => onSelected(frame)}
              className={mx(
                'w-full outline-0',
                frame[deleted] && 'text-red-300',
                selected === frame && 'text-blue-300'
              )}
              spellCheck={false}
              value={frame.name}
              placeholder='Enter text'
              onChange={(value) => {
                frame.name = value;
              }}
            />
          }
        />
      ))} */}
      {/* <CardRow
        action={
          <Button
            className='text-gray-300'
            onClick={() => {
              space.experimental.db
                .save(
                  new Frame({
                    name: newFrame,
                    content: new TextObject()
                  })
                )
                .catch((err) => log.catch(err));
              setNewFrame('');
            }}
          >
            Create
          </Button>
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
      /> */}
    </div>
  );
});

const EXAMPLE = `
import React from 'react'
import { useQuery, useSpaces } from '@dxos/react-client'
import { Task } from '@kai/schema'
import { id } from '@dxos/echo-schema'

const Frame = () => {
  const [space] = useSpaces()
  const tasks = useQuery(space, Task.filter())

  return (
    <ul>
      {tasks.map(task => (
        <li key={task[id]}>{task.title}</li>
      ))}
    </ul>
  )
}

export default Frame;
`;
