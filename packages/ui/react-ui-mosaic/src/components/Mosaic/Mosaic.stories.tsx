//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Mosaic } from './Mosaic';
import { styles } from './styles';

faker.seed(1);

// TODO(burdon): Option to insert placeholder while dragging.

const TestData = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Test',
    version: '0.1.0',
  }),
);

interface TestData extends Schema.Schema.Type<typeof TestData> {}

const Cell = ({ item }: { item: TestData }) => {
  const [handleRef, setHandleRef] = useState<HTMLDivElement | null>(null);
  return (
    <Mosaic.Cell key={item.id} dragHandle={handleRef} object={item} classNames={['p-1', styles.cell.dragging]}>
      <div className='flex gap-2 items-center p-1 border border-separator'>
        <div ref={setHandleRef}>
          <Icon icon='ph--dots-six-vertical--regular' />
        </div>
        <div className='truncate'>{item.name}</div>
      </div>
    </Mosaic.Cell>
  );
};

const DefaultStory = () => {
  const [items, setItems] = useState<TestData[]>(() =>
    Array.from({ length: 10 }).map((_, i) =>
      Obj.make(TestData, {
        name: `${i} ${faker.lorem.sentence()}`,
      }),
    ),
  );

  return (
    <Mosaic.Root>
      <div
        role='none'
        className={mx(
          'm-2 flex flex-col bs-full overflow-hidden',
          'rounded-sm border border-separator',
          styles.container.active,
        )}
      >
        <Mosaic.Container
          classNames='overflow-y-auto p-2'
          autoscroll
          handler={{
            id: 'container',
            canDrop: () => true,
            onDrop: ({ source, target }) => {
              const from = items.findIndex((item) => item.id === source.id);
              const to = target?.type === 'cell' ? items.findIndex((item) => item.id === target.id) : -1;
              if (from !== -1) {
                items.splice(from, 1);
                items.splice(to, 0, source.object as TestData);
                setItems([...items]);
              }
            },
          }}
        >
          {items.map((item) => (
            <Cell key={item.id} item={item} />
          ))}
        </Mosaic.Container>
      </div>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Mosaic',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
