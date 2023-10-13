//
// Copyright 2023 DXOS.org
//

import React, { type MutableRefObject, type PropsWithChildren } from 'react';

import { Main } from '@dxos/aurora';
import { type ComposerModel, type MarkdownComposerRef } from '@dxos/aurora-composer';
import {
  baseSurface,
  coarseBlockPaddingStart,
  inputSurface,
  mx,
  surfaceElevation,
  textBlockWidth,
} from '@dxos/aurora-theme';

import { type MarkdownProperties } from '../types';

export const StandaloneLayout = ({
  children,
}: PropsWithChildren<{
  model: ComposerModel;
  properties: MarkdownProperties;
  // TODO(wittjosiah): ForwardRef.
  editorRef?: MutableRefObject<MarkdownComposerRef>;
}>) => {
  return (
    <Main.Content bounce classNames={[baseSurface, coarseBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div
          role='none'
          className={mx(
            inputSurface,
            surfaceElevation({ elevation: 'group' }),
            'mbs-2 mbe-6 pli-6 rounded',
            'min-bs-[calc(100dvh-5rem)] flex flex-col',
          )}
        >
          {children}
        </div>
      </div>
    </Main.Content>
  );
};
