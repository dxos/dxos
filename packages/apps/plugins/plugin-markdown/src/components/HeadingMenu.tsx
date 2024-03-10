//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { type PropsWithChildren, type FC } from 'react';

import { Surface } from '@dxos/app-framework';
import { getSpaceForObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Button, DropdownMenu } from '@dxos/react-ui';
import { useTextModel, type EditorModel } from '@dxos/react-ui-editor';
import { fineButtonDimensions, getSize } from '@dxos/react-ui-theme';

import { type DocumentType, type MarkdownProperties } from '../types';

// TODO(thure): This needs to be refactored into a graph node action.
export const DocumentHeadingMenu: FC<{ document: DocumentType }> = ({ document }) => {
  const identity = useIdentity();
  // TODO(wittjosiah): Should this be a hook?
  const space = getSpaceForObject(document);
  const model = useTextModel({ identity, space, text: document?.content });
  if (!model) {
    return null;
  }

  return <HeadingMenu properties={document} model={model} />;
};

/**
 * Menu for the layout heading.
 */
export const HeadingMenu = ({
  model,
  properties,
}: PropsWithChildren<{
  model: EditorModel;
  properties: MarkdownProperties;
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
            <Surface data={{ model, properties }} role='menuitem' />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
