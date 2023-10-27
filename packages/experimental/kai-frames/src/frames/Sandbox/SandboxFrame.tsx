//
// Copyright 2023 DXOS.org
//

import { PlayCircle } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { compile, Editor, Frame, FrameContainer } from '@dxos/kai-sandbox';
import { Toolbar } from '@dxos/mosaic';
import { useQuery, Text } from '@dxos/react-client/echo';

import { sampleCode } from './sample';
import { useFrameContext } from '../../hooks';

// TODO(burdon): Move EmbeddedFrame here.

export const SandboxFrame = () => {
  const { space } = useFrameContext();
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
          content: new Text(),
        });

        await space?.db.add(frame);
        frame.content.doc!.getText('monaco').insert(0, sampleCode);
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

  if (!space || !selected) {
    return null;
  }

  // TODO(burdon): onChange not working.
  return (
    <div className='flex flex-1 overflow-hidden'>
      <div className='flex flex-1 flex-col overflow-hidden border-r'>
        <Toolbar>
          <h2>{selected.name}</h2>
          <div className='flex-1' />
          <Button variant='ghost' onClick={handleCompile}>
            <PlayCircle className={getSize(6)} />
          </Button>
        </Toolbar>

        <div className='flex flex-1 overflow-hidden'>
          <Editor document={selected?.content} onChange={handleUpdate} />
        </div>
      </div>

      <div className='flex-1 overflow-hidden'>{selected?.compiled && <FrameContainer frame={selected} />}</div>
    </div>
  );
};

export default SandboxFrame;
