//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { type Obj } from '@dxos/echo';
import { createDocAccessor, createObject } from '@dxos/echo-db';
import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { get } from '@dxos/util';

import { Editor } from '../Editor';
import { Grid } from '../Grid';

// TODO(burdon): Drag-and-drop cells.

const Cell = ({ item }: { item: Obj.Any }) => {
  const accessor = useMemo(() => createDocAccessor(item, ['content']), [item]);
  const extensions = useMemo(() => [automerge(accessor)], [accessor]);
  const initialValue = useMemo(() => {
    const doc = accessor.handle.doc();
    return doc ? get(doc, accessor.path) : '';
  }, [accessor]);

  // TODO(burdon): Jump to end of line.
  return <Editor.Content extensions={extensions} initialValue={initialValue} />;
};

const DefaultStory = () => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ placeholder: 'Enter text' }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
    ],
    [],
  );

  const [items, setItems] = useState(['A', 'B', 'C', 'D', 'E'].map((item) => createObject(Text.make(item))));

  return (
    <Editor.Root extensions={extensions}>
      <Grid.Root>
        <Grid.Viewport>
          <Grid.Column items={items} Component={Cell} />
        </Grid.Viewport>
      </Grid.Root>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Grid',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column', classNames: 'is-[400px]' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
