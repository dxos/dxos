//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { NavigationAction, useIntentDispatcher, useResolvePlugin, parseLayoutPlugin } from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart, fixedInsetFlexLayout, bottombarBlockPaddingEnd } from '@dxos/react-ui-theme';

import { RevealPlayer } from './Reveal';
import { PRESENTER_PLUGIN } from '../meta';
import { TOGGLE_PRESENTATION } from '../types';

const PresenterMain: FC<{ document: DocumentType }> = ({ document }) => {
  const fullscreen = useResolvePlugin(parseLayoutPlugin)?.provides.layout.fullscreen;
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
        content={document.content?.content ?? ''}
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
