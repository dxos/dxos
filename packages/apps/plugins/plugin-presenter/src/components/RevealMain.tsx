//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { useResolvePlugin, parseLayoutPlugin } from '@dxos/app-framework';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  topbarBlockPaddingStart,
  fixedInsetFlexLayout,
  bottombarBlockPaddingEnd,
} from '@dxos/react-ui-theme';

import { RevealPlayer } from './Reveal';

const PresenterMain: FC<{ document: DocumentType }> = ({ document }) => {
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const fullscreen = layoutPlugin?.provides.layout.fullscreen;

  return (
    <Main.Content
      classNames={[
        baseSurface,
        fixedInsetFlexLayout,
        !fullscreen && topbarBlockPaddingStart,
        !fullscreen && bottombarBlockPaddingEnd,
      ]}
    >
      <RevealPlayer content={document.content?.content ?? ''} />
    </Main.Content>
  );
};

export default PresenterMain;
