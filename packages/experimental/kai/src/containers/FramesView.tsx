//
// Copyright 2023 DXOS.org
//

import { XCircle } from 'phosphor-react';
import React, { useEffect, useState } from 'react';

import { deleted, id, TextObject } from '@dxos/echo-schema';
import { compile, Editor, Frame } from '@dxos/framebox';
import { log } from '@dxos/log';
import { useQuery, withReactor } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

import { CardRow, Input } from '../components';
import { EmbeddedFrame } from '../frames';
import { useSpace } from '../hooks';

export const FramesView = withReactor(() => {
  const [selected, setSelected] = useState<Frame | undefined>(undefined);

  useEffect(() => {
    const id = setInterval(async () => {
      if (selected) {
        await compile(selected);
        console.log(selected);
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

export type FrameListProps = {
  selected: Frame | undefined;
  onSelected: (frame: Frame) => void;
};

export const FrameList = withReactor(({ selected, onSelected }: FrameListProps) => {
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
    }
  }, []);

  return (
    <div>
      {frames.map((frame) => (
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
      ))}
      <CardRow
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
      />
    </div>
  );
});

const EXAMPLE = `
import React from 'https://cdn.jsdelivr.net/npm/@esm-bundle/react@17.0.2-fix.1/esm/react.development.min.js'

const Frame = () => {
  return <div>Hello world</div>
}

export default Frame;
`;
