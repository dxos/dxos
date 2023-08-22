//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical } from '@phosphor-icons/react';
import React, { PropsWithChildren, RefObject } from 'react';

import { Button, DropdownMenu } from '@dxos/aurora';
import { ComposerModel, MarkdownComposerRef } from '@dxos/aurora-composer';
import { getSize } from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { MarkdownProperties } from '../types';

export const StandaloneMenu = ({
  model,
  properties,
  editorRef,
}: PropsWithChildren<{
  model: ComposerModel;
  properties: MarkdownProperties;
  // TODO(wittjosiah): ForwardRef.
  editorRef?: RefObject<MarkdownComposerRef>;
}>) => {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant='ghost'>
          <DotsSixVertical className={getSize(4)} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={10} classNames='z-10'>
          <Surface data={[model, properties, editorRef]} role='menuitem' />
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
