//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Oscilloscope } from '@dxos/react-ui-audio';
import * as Flex from '@dxos/react-ui/Flex';
import * as Panel from '@dxos/react-ui/Panel';

import { Mixer } from '#components';
import { useMixerEngine } from '#hooks';
import { Dream } from '#types';

export type ZenArticleProps = AppSurface.ObjectArticleProps<Dream.Dream>;

export const ZenArticle = ({ role, subject: dream, attendableId: _attendableId }: ZenArticleProps) => {
  const { engine, playing, outputNode } = useMixerEngine();

  return (
    <Panel.Root role={role} width='document'>
      <Panel.Body classNames='grid grid-rows-[3fr_1fr]'>
        <Mixer dream={dream} engine={engine} />
        <Flex.Flex column classNames='p-2'>
          <Oscilloscope mode='waveform' active={playing} source={outputNode} />
        </Flex.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};

ZenArticle.displayName = 'ZenArticle';
