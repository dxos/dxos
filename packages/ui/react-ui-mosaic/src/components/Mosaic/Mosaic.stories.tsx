//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { Fragment, useMemo, useState } from 'react';

import { Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { Mosaic, useMosaicContainerContext, useMosaicContext } from './Mosaic';
import { styles } from './styles';
import { type MosaicCellData, type MosaicData } from './types';

faker.seed(1);

// TODO(burdon): Key nav (as with Grid story).
// TODO(burdon): Placeholders.

const TestData = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Test',
    version: '0.1.0',
  }),
);

interface TestData extends Schema.Schema.Type<typeof TestData> {}

// TODO(burdon): Factor out.
const splice = <T extends Obj.Any>(items: T[], source: MosaicCellData, target?: MosaicData): T[] => {
  const from = items.findIndex((item) => item.id === source.id);
  // TODO(burdon): Deal with placeholder.
  const to = target?.type === 'cell' ? items.findIndex((item) => item.id === target.id) : -1;
  if (from !== -1) {
    const newItems = [...items];
    newItems.splice(from, 1);
    if (target) {
      newItems.splice(to, 0, source.object as T);
    }

    return newItems;
  }

  return items;
};

const Container = ({ items }: { items: TestData[] }) => {
  const { dragging } = useMosaicContainerContext(Container.displayName);

  // TODO(burdon): Factor out.
  const visibleItems = useMemo(() => {
    if (!dragging) {
      return items;
    }

    return splice(items, dragging.source);
  }, [items, dragging]);

  return (
    <>
      {visibleItems.map((item) => (
        <Fragment key={item.id}>
          <Cell item={item} />
        </Fragment>
      ))}
    </>
  );
};

Container.displayName = 'Container';

const Cell = ({ classNames, item }: ThemedClassName<{ item: TestData }>) => {
  const [handleRef, setHandleRef] = useState<HTMLDivElement | null>(null);
  return (
    <Mosaic.Cell
      key={item.id}
      dragHandle={handleRef}
      object={item}
      classNames={[styles.cell.dragging, classNames]}
      gap={{ y: 4 }}
    >
      <div className='flex gap-2 items-center p-1 border border-separator'>
        <div ref={setHandleRef} className='_cursor-pointer'>
          <Icon icon='ph--dots-six-vertical--regular' />
        </div>
        <div className='truncate'>{item.name}</div>
      </div>
    </Mosaic.Cell>
  );
};

Cell.displayName = 'Cell';

const Debug = ({ classNames }: ThemedClassName) => {
  const info = useMosaicContext(Debug.displayName);
  return <Json data={info} classNames={classNames} />;
};

Debug.displayName = 'Debug';

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
      <div role='none' className='bs-full is-full p-2 grid grid-cols-2 gap-2'>
        <div
          role='none'
          className={mx(
            'flex flex-col bs-full overflow-hidden',
            'border border-separator rounded-sm',
            styles.container.active,
          )}
        >
          <Mosaic.Container
            classNames='flex flex-col p-2 overflow-y-auto'
            autoscroll
            handler={{
              id: 'test-container',
              canDrop: () => true,
              onDrop: ({ source, target }) => {
                setItems(splice(items, source, target));
              },
            }}
          >
            <Container items={items} />
          </Mosaic.Container>
        </div>
        <Debug classNames='text-xs' />
      </div>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Mosaic',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
