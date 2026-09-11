//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { Icon } from '@dxos/react-ui';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { type AudioShape } from './audio-def.ts';

export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const [active, setActive] = useState(false);
  useEffect(() => {
    runtime.setOutput(DEFAULT_OUTPUT, active);
  }, [active]);

  // https://docs.pmnd.rs/react-three-fiber/api/canvas#render-props
  return (
    <div className='flex w-full justify-center items-center'>
      <Icon
        icon={active ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'}
        classNames={['transition opacity-20 duration-1000', active && 'opacity-100 text-error-text']}
        size={8}
        onClick={() => setActive(!active)}
      />
    </div>
  );
};
