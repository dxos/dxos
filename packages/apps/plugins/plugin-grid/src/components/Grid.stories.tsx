//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { type DecoratorFunction } from '@storybook/csf';
import { type ReactRenderer } from '@storybook/react';
import React, { type Ref, forwardRef, useState } from 'react';

import { Surface, SurfaceProvider } from '@dxos/app-framework';
import { type TestObjectGenerator, TestSchemaType, createTestObjectGenerator } from '@dxos/echo-generator';
import { TypedObject } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui-card';
import {
  Mosaic,
  type MosaicTileComponent,
  type MosaicDropEvent,
  type MosaicTileProps,
  type MosaicOperation,
} from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { Grid, type GridProps, type GridDataItem } from './Grid';
import type { Position } from './layout';

faker.seed(99);

const debug = true;
const size = { x: 4, y: 4 };

export type DemoGridProps = GridProps & {
  initialItems?: GridDataItem[];
  types?: Partial<Record<TestSchemaType, number>>;
  debug?: boolean;
  generator?: TestObjectGenerator;
};

const DemoGrid = ({
  id = 'grid',
  options = { size: { x: 8, y: 8 } },
  Component = DemoCard,
  initialItems,
  types = { [TestSchemaType.document]: 12 },
  debug,
  className,
  generator = createTestObjectGenerator(),
}: DemoGridProps) => {
  const [selected, setSelected] = useState<string>();
  const [items, setItems] = useState<GridDataItem[]>(
    initialItems ??
      (() => {
        const objects = generator.createObjects(types);
        // TODO(wittjosiah): Use generator to create positions.
        return objects.map((object) => {
          return new TypedObject<{ object: TypedObject; position: Position }>({
            object,
            position: {
              x: faker.number.int({ min: 0, max: (options.size?.x ?? 1) - 1 }),
              y: faker.number.int({ min: 0, max: (options.size?.y ?? 1) - 1 }),
            },
          });
        });
      }),
  );

  const handleDrop = ({ active, over }: MosaicDropEvent<Position>) => {
    if (over.path !== id) {
      setItems((items) => items.filter((item) => item.id !== active.item.id));
    } else {
      setItems((items) => {
        const index = items.findIndex((item) => item.id === active.item.id);
        if (index === -1) {
          const item = active.item as GridDataItem;
          item.position = over.position!;
          return [item, ...items];
        } else {
          const item = items[index];
          item.position = over.position!;
          const newItems = [...items];
          newItems.splice(index, 1);
          return [item, ...newItems];
        }
      });
    }
  };

  const handleCreate = (position: Position) => {
    setItems((items) => {
      const object = generator.createObject({ types: [TestSchemaType.document] });
      const item = new TypedObject<{ object: TypedObject; position: Position }>({
        object,
        position,
      });
      setTimeout(() => {
        setSelected(item.id);
      });
      return [item, ...items];
    });
  };

  return (
    <Grid
      id={id}
      items={items}
      options={options}
      Component={Component}
      className={className}
      debug={debug}
      selected={selected}
      onSelect={setSelected}
      onDrop={handleDrop}
      onOver={() => 'transfer'}
      onCreate={handleCreate}
    />
  );
};

type DemoCardProps = GridDataItem & { object?: { title?: string; content?: string; image?: string } };

const DemoCard: MosaicTileComponent<DemoCardProps> = forwardRef(
  (
    { className, isDragging, draggableStyle, draggableProps, item: { id, object }, grow, debug, onSelect },
    forwardRef,
  ) => {
    const { title, content, image } = object ?? {};
    const full = !title;
    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root
          noPadding={full}
          classNames={mx(className, 'w-full snap-center', isDragging && 'opacity-20')}
          grow={grow}
        >
          <Card.Header floating={full} onDoubleClick={() => onSelect?.()}>
            <Card.DragHandle position={full ? 'left' : undefined} {...draggableProps} />
            {title && <Card.Title title={title} />}
            <Card.Menu position={full ? 'right' : undefined} />
          </Card.Header>
          {image && <Card.Media src={image} />}
          {title && content && (
            <Card.Body gutter classNames='line-clamp-3 text-sm'>
              {content}
            </Card.Body>
          )}
          {debug && (
            <Card.Body>
              <Mosaic.Debug data={{ id }} />
            </Card.Body>
          )}
        </Card.Root>
      </div>
    );
  },
);

const SurfaceCard: MosaicTileComponent<DemoCardProps> = forwardRef(({ item, ...props }, forwardRef) => {
  return <Surface role='card' ref={forwardRef} data={{ object: item }} {...props} />;
});

export default {
  component: Grid,
  render: (args: DemoGridProps) => {
    return (
      <Mosaic.Root debug={debug}>
        <Mosaic.DragOverlay />
        <DemoGrid {...args} />
      </Mosaic.Root>
    );
  },
  args: { id: 'grid', options: { size } },
};

export const Default = {};

export const WithSurface = {
  args: {
    Component: SurfaceCard,
  },
  decorators: [
    (Story) => (
      <SurfaceProvider
        value={{
          components: {
            card: ({ data: { object }, ...props }, forwardedRef) => {
              return (
                <DemoCard
                  {...(props as Omit<MosaicTileProps, 'Component' | 'operation'> & { operation: MosaicOperation })}
                  item={object as any}
                  ref={forwardedRef as Ref<HTMLDivElement>}
                />
              );
            },
          },
        }}
      >
        <Story />
      </SurfaceProvider>
    ),
  ] satisfies DecoratorFunction<ReactRenderer, any>[],
};
