//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';
import { Oscilloscope } from '@dxos/react-ui-sfx';

import { useMixerEngine } from '../../hooks';
import { type Dream } from '../../types';
import { Mixer } from '../../components';

export type ZenArticleProps = SurfaceComponentProps<Dream.Dream>;

export const ZenArticle = ({ role, subject: dream }: ZenArticleProps) => {
  const { engine, playing, outputNode } = useMixerEngine();

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Content className='grid grid-rows-[3fr_1fr]'>
        <Mixer engine={engine} />
        <div role='none' className='flex flex-col h-full py-4'>
          <Oscilloscope mode='waveform' active={playing} source={outputNode} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
