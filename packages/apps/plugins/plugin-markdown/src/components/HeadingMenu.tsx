//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { type PropsWithChildren, type FC } from 'react';

import { type DocumentType } from '@braneframe/types';
import { Surface } from '@dxos/app-framework';
import { getTextContent } from '@dxos/echo-schema';
import { Button, DropdownMenu } from '@dxos/react-ui';
import { fineButtonDimensions, getSize } from '@dxos/react-ui-theme';

import { type MarkdownProperties } from '../types';

// TODO(thure): This needs to be refactored into a graph node action.
export const DocumentHeadingMenu: FC<{ document: DocumentType }> = ({ document }) => {
  return <HeadingMenu properties={document} content={getTextContent(document.content)} />;
};

/**
 * Menu for the layout heading.
 */
export const HeadingMenu = ({
  content,
  properties,
}: PropsWithChildren<{
  content: string | undefined;
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
            <Surface data={{ content, properties }} role='menuitem' />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
