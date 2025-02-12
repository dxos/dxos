//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { createIntent, useLayout, useIntentDispatcher } from '@dxos/app-framework';
import { type DocumentType } from '@dxos/plugin-markdown/types';
import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart, fixedInsetFlexLayout, bottombarBlockPaddingEnd } from '@dxos/react-ui-theme';

import { RevealPlayer } from './Reveal';
import { PresenterAction } from '../types';

const PresenterMain: FC<{ document: DocumentType }> = ({ document }) => {
  const layout = useLayout();
  const fullscreen = layout.mode === 'fullscreen';
  const { dispatchPromise: dispatch } = useIntentDispatcher();

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
          void dispatch(createIntent(PresenterAction.TogglePresentation, { object: document, state: false }));
        }}
      />
    </Main.Content>
  );
};

export default PresenterMain;
