//
// Copyright 2023 DXOS.org
//

import React, { MutableRefObject, PropsWithChildren } from 'react';

import { Main } from '@dxos/aurora';
import { ComposerModel, MarkdownComposerRef } from '@dxos/aurora-composer';
import { coarseBlockPaddingStart, inputSurface, mx, surfaceElevation, textBlockWidth } from '@dxos/aurora-theme';

import { MarkdownProperties } from '../types';

export const StandaloneLayout = ({
  children,
}: PropsWithChildren<{
  model: ComposerModel;
  properties: MarkdownProperties;
  // TODO(wittjosiah): ForwardRef.
  editorRef?: MutableRefObject<MarkdownComposerRef>;
}>) => {
  return (
    <Main.Content bounce classNames={coarseBlockPaddingStart}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div
          role='none'
          className={mx(
            inputSurface,
            surfaceElevation({ elevation: 'group' }),
            'mbs-2 mbe-6 pli-6 rounded',
            'min-bs-[calc(100dvh-4.5rem)] flex flex-col',
          )}
        >
          {children}
        </div>
      </div>
    </Main.Content>
  );
};
