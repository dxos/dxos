//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { createDocAccessor, createObject } from '@dxos/echo-db';
import { faker } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
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

// CONCEPT: Can the entire app be built from a small number of primitives like this?

// TODO(burdon): Multi-column board / Hiararchy (left-to-right) / Infinite canvas / (Graph).
//  Type note, then have AI create history (to the right).
// TODO(burdon): Search / Filter / Sort (Tags).
// TODO(burdon): Mobile / CRX.
// TODO(burdon): Content types (Text, Mixed, Image, Form, etc).
// TODO(Burdon): AI / Auto-search.

// TODO(burdon): Key nav / focus.
// TODO(burdon): Menu.
// TODO(burdon): Virtualization?
// TODO(burdon): Use Card for Cell content.
// TODO(burdon): Replace stack? (Or simplify)
// TODO(burdon): Factor out/generalize? (remove deps from dxos/ui-editor)

const Cell: GridCellProps['Cell'] = ({ item, dragging }) => {
  const accessor = useMemo(() => createDocAccessor(item, ['content']), [item]);
  const extensions = useMemo(() => [automerge(accessor)], [accessor]);
  const initialValue = useMemo(() => {
    const doc = accessor.handle.doc();
    return doc ? get(doc, accessor.path) : '';
  }, [accessor]);

  if (dragging) {
    return <div className='truncate'>{initialValue.slice(0, 80)}</div>;
  }

  // TODO(burdon): Set focusable=false if handling focus in Cell.
  return <Editor.Content classNames='outline-none' extensions={extensions} initialValue={initialValue} />;
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
          <Grid.Column items={items} Cell={Cell} classNames='is-[25rem]' />
        </Grid.Viewport>
      </Grid.Root>
    </Editor.Root>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Grid',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
