//
// Copyright 2023 DXOS.org
//

import React, { MutableRefObject, PropsWithChildren } from 'react';

import { Main } from '@dxos/aurora';
import { ComposerModel, MarkdownComposerRef } from '@dxos/aurora-composer';

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
    <Main.Content bounce>
      <div role='none' className='mli-auto max-is-[60rem] min-bs-[calc(100dvh-2.5rem)] flex flex-col'>
        {children}
      </div>
    </Main.Content>
  );
};
