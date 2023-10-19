//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { type PropsWithChildren, type RefObject } from 'react';

import { Button, DropdownMenu } from '@dxos/react-ui';
import { type ComposerModel, type MarkdownComposerRef } from '@dxos/react-ui-composer';
import { fineButtonDimensions, getSize } from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { type MarkdownProperties } from '../types';

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
        <Button variant='ghost' classNames={fineButtonDimensions}>
          <DotsThreeVertical className={getSize(4)} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={8} classNames='z-10'>
          <DropdownMenu.Viewport>
            <Surface data={[model, properties, editorRef]} role='menuitem' />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
