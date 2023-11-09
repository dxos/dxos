//
// Copyright 2023 DXOS.org
//

import React, { type MutableRefObject, type PropsWithChildren } from 'react';

import { Main } from '@dxos/react-ui';
import { type EditorModel, type MarkdownEditorRef } from '@dxos/react-ui-editor';
import { baseSurface, coarseBlockPaddingStart, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { type MarkdownProperties } from '../types';

export const StandaloneLayout = ({
  children,
}: PropsWithChildren<{
  model: EditorModel;
  properties: MarkdownProperties;
  // TODO(wittjosiah): ForwardRef.
  editorRef?: MutableRefObject<MarkdownEditorRef>;
}>) => {
  return (
    <Main.Content bounce classNames={[baseSurface, coarseBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div role='none' className={mx('mbs-4 mbe-6', 'min-bs-[calc(100dvh-5rem)] flex flex-col')}>
          {children}
        </div>
      </div>
    </Main.Content>
  );
};
