//
// Copyright 2024 DXOS.org
//
import '@dxosTheme';
import React, { useState } from 'react';

import { TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { Tooltip, useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  image,
  table,
  Toolbar,
  useActionHandler,
  useFormattingState,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import type { StackSectionContent, StackSectionItem } from './Section';
import { Stack } from './Stack';

faker.seed(1234);

const EditorContent = ({ data: { content = '' } }: { data: StackSectionContent & { content?: string } }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(E.object(TextV0Type, { content }));
  const id = text.id;
  const doc = text.content;
  const [formattingState, formattingObserver] = useFormattingState();
  const { parentRef, view } = useTextEditor(() => {
    return {
      id,
      doc,
      extensions: [
        formattingObserver,
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, slots: { editor: { className: 'p-2' } } }),
        decorateMarkdown(),
        formattingKeymap(),
        image(),
        table(),
      ],
    };
  }, [id, formattingObserver, themeMode]);

  const handleAction = useActionHandler(view);

  return (
    <>
      <Toolbar.Root
        onAction={handleAction}
        state={formattingState}
        classNames='sticky block-start-0 bg-[--sticky-bg] z-10'
      >
        <Toolbar.Markdown />
        <Toolbar.Separator />
      </Toolbar.Root>
      <div ref={parentRef} className={textBlockWidth} />
    </>
  );
};

const EditorsStack = () => {
  const [items, _setItems] = useState<StackSectionItem[]>(
    [...Array(12)].map(() => ({
      id: faker.string.uuid(),
      object: { id: faker.string.uuid(), content: faker.lorem.paragraphs(4) },
    })),
  );
  return (
    <Tooltip.Provider>
      <Mosaic.Root>
        <Mosaic.DragOverlay />
        <Stack id='stack-editors' SectionContent={EditorContent} items={items} />
      </Mosaic.Root>
    </Tooltip.Provider>
  );
};

export default {
  title: 'react-ui-stack/Editors',
  component: EditorsStack,
  decorators: [withTheme],
  args: {},
};

export const Editors = {
  args: {},
  parameters: {
    layout: 'fullscreen',
  },
};
