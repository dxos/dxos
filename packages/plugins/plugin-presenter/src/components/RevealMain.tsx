//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { NavigationAction, useIntentDispatcher, useResolvePlugin, parseLayoutPlugin } from '@dxos/app-framework';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart, fixedInsetFlexLayout, bottombarBlockPaddingEnd } from '@dxos/react-ui-theme';

import { RevealPlayer } from './Reveal';
import { PRESENTER_PLUGIN } from '../meta';
import { TOGGLE_PRESENTATION } from '../types';

const PresenterMain: FC<{ document: DocumentType }> = ({ document }) => {
  const fullscreen = useResolvePlugin(parseLayoutPlugin)?.provides.layout.layoutMode === 'fullscreen';
  const dispatch = useIntentDispatcher();

  return (
    <Main.Content
      classNames={[
        fixedInsetFlexLayout,
        !fullscreen && topbarBlockPaddingStart,
        !fullscreen && bottombarBlockPaddingEnd,
      ]}
    >
      <RevealPlayer
        content={document.content.target?.content ?? ''}
        onExit={() => {
          void dispatch([
            {
              plugin: PRESENTER_PLUGIN,
              action: TOGGLE_PRESENTATION,
              data: { state: false },
            },
            {
              action: NavigationAction.CLOSE,
              data: { activeParts: { fullScreen: fullyQualifiedId(document) } },
            },
          ]);
        }}
      />
    </Main.Content>
  );
};

export default PresenterMain;
