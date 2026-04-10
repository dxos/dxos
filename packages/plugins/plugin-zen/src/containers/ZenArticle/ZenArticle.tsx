//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';
import { Oscilloscope } from '@dxos/react-ui-sfx';

import { Mixer } from '#components';
import { useMixerEngine } from '#hooks';
import { type Dream } from '#types';

export type ZenArticleProps = AppSurface.ObjectArticleProps<Dream.Dream>;

export const ZenArticle = ({ role, subject: dream, attendableId: _attendableId }: ZenArticleProps) => {
  const { engine, playing, outputNode } = useMixerEngine();

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Content className='grid grid-rows-[3fr_1fr]'>
        <Mixer dream={dream} engine={engine} />
        <div role='none' className='flex flex-col p-2'>
          <Oscilloscope mode='waveform' active={playing} source={outputNode} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
