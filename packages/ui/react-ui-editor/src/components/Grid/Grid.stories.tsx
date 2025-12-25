//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { createDocAccessor, createObject } from '@dxos/echo-db';
import { faker } from '@dxos/random';
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
import { range } from '@dxos/util';
import { get } from '@dxos/util';

import { Editor } from '../Editor';
import { Grid, type GridCellProps, type GridViewportProps } from '../Grid';

faker.seed(1);

// TODO(burdon): Multi-column board / Infinite canvas / (Graph).
// TODO(burdon): Mobile.

// TODO(burdon): Use Card for Cell content.
// TODO(burdon): Key nav.
// TODO(burdon): Replace stack?
// TODO(Burdon): AI / Auto-search.

const Cell: GridCellProps['Cell'] = ({ item, dragging }) => {
  const accessor = useMemo(() => createDocAccessor(item, ['content']), [item]);
  const extensions = useMemo(() => [automerge(accessor)], [accessor]);
  const initialValue = useMemo(() => {
    const doc = accessor.handle.doc();
    return doc ? get(doc, accessor.path) : '';
  }, [accessor]);

  if (dragging) {
    return <div className='truncate'>{item.id}</div>;
  }

  // TODO(burdon): Jump to end of line.
  return <Editor.Content classNames='!outline-none' extensions={extensions} initialValue={initialValue} />;
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

  // TODO(burdon): Data model for position?
  const [items, setItems] = useState(range(20).map(() => createObject(Text.make(faker.lorem.paragraph()))));

  const handleCellMove = useCallback<NonNullable<GridViewportProps['onCellMove']>>(
    (from, to) => {
      const [item] = items.splice(from, 1);
      items.splice(to, 0, item);
      setItems([...items]);
    },
    [items],
  );

  return (
    <Editor.Root extensions={extensions}>
      <Grid.Root>
        <Grid.Viewport onCellMove={handleCellMove}>
          <Grid.Column items={items} Cell={Cell} />
        </Grid.Viewport>
      </Grid.Root>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Grid',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column', classNames: 'is-[300px]' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
