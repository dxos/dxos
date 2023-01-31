//
// Copyright 2023 DXOS.org
//

import { PlayCircle } from 'phosphor-react';
import React, { useEffect, useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { compile, Editor, Frame } from '@dxos/framebox';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Button } from '../components';
import { EmbeddedFrame } from '../frame-container';
import { useSpace } from '../hooks';

export const SandboxFrame = withReactor(() => {
  const space = useSpace();
  const frames = useQuery(space, Frame.filter());
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  // Create initial frame.
  // TODO(burdon): Rename Frame type if empty.
  const [selected, setSelected] = useState<Frame>();
  useEffect(() => {
    if (frames.length === 0) {
      setTimeout(async () => {
        const frame = new Frame({
          name: 'Frame.tsx',
          content: new TextObject()
        });

        await space.experimental.db.save(frame);
        frame.content.doc!.getText('monaco').insert(0, EXAMPLE);
        setSelected(frame);
      });
    } else {
      setSelected(frames[0]);
    }
  }, []);

  const handleCompile = () => {
    void compile(selected!);
  };

  const handleUpdate = () => {
    // Throttle compile.
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      handleCompile();
    }, 1000);
  };

  if (!selected) {
    return null;
  }

  const Toolbar = () => {
    return (
      <div className='flex flex-shrink-0 w-full justify-between p-2 bg-gray-200'>
        <h2>{selected.name}</h2>
        <Button onClick={handleCompile}>
          <PlayCircle className={getSize(6)} />
        </Button>
      </div>
    );
  };

  // TODO(burdon): onChange not working.
  return (
    <div className='flex h-full overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-hidden border-r'>
        <Toolbar />
        <div className='flex flex-1 overflow-hidden mt-2'>
          <Editor document={selected?.content} onChange={handleUpdate} />
        </div>
      </div>

      <div className='flex-1 overflow-hidden'>{selected?.compiled && <EmbeddedFrame frame={selected} />}</div>
    </div>
  );
});

export default SandboxFrame;

// TODO(burdon): Factor out to testing.
const EXAMPLE = `// Example frame component.

import React, { useState } from 'react'
import { useQuery, useSpaces } from '@dxos/react-client'
import { Task } from '@kai/schema'
import { id } from '@dxos/echo-schema'

const Frame = () => {
  const [space] = useSpaces()
  const tasks = useQuery(space, Task.filter())
  const [value, setValue] = useState('');
  
  const handleCreate = () => {
    const task = new Task({ title: value });
    space.experimental.db.save(task);
  }

  return (
    <div className='w-full p-4'>
      <ul>
        {tasks.map(task => (
          <li key={task[id]} className='p-1 hover:bg-blue-200'>{task.title}</li>
        ))}
      </ul>
      <div className='flex p-1 mt-4'>
        <input className='w-full border-b pr-4' value={value} onChange={ev => setValue(ev.target.value)} />
        <button onClick={handleCreate}>Add</button>
      </div>
    </div>
  )
}

export default Frame;
`;
