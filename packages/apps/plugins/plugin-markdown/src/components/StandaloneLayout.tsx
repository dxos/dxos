//
// Copyright 2023 DXOS.org
//

import React, { type MutableRefObject, type PropsWithChildren } from 'react';

import { Main } from '@dxos/react-ui';
import { type EditorModel, type MarkdownEditorRef } from '@dxos/react-ui-editor';
import { baseSurface, topbarBlockPaddingStart, mx, textBlockWidth } from '@dxos/react-ui-theme';

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
    <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div role='none' className={mx('plb-4 min-bs-[calc(100dvh-var(--topbar-size))] flex flex-col')}>
          {children}
        </div>
        <div role='none' className='bs-[50dvh]' />
      </div>
    </Main.Content>
  );
};
