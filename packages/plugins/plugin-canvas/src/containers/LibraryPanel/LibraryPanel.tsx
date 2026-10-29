//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import { type Scene } from '@dxos/scene';

export type LibraryPanelProps = {
  /** The canvas model's objects. */
  objects: readonly (Scene.Object2D | Scene.Object3D)[];
  /** The object the place tool is putting down, if any. */
  placing?: string;
  onPlace: (id: string) => void;
  /** Opens a composite object's parts layout. */
  onEditParts: (layout: string) => void;
};

/** The canvas model's objects: each places with a click, and a composite's parts open for editing. */
export const LibraryPanel = ({ objects, placing, onPlace, onEditParts }: LibraryPanelProps) => (
  <OrderedList.Root items={objects} getLabel={(object) => object.id} readonly>
    {({ items }) => (
      <>
        <OrderedList.Label>Library</OrderedList.Label>
        <OrderedList.Viewport>
          <OrderedList.Content data-testid='library'>
            {items.map((object) => (
              <OrderedList.Item key={object.id} id={object.id} canDrag={false} data-testid={`library-${object.id}`}>
                <OrderedList.ItemIcon icon={object.parts ? 'ph--stack--regular' : 'ph--cube--regular'} />
                <OrderedList.ItemText />
                <OrderedList.ItemDescription>{object.kind}</OrderedList.ItemDescription>
                {object.parts !== undefined && (
                  <Button.Root
                    variant='ghost'
                    iconOnly
                    icon='ph--pencil-simple--regular'
                    label='Edit parts'
                    data-testid={`library-${object.id}-edit`}
                    onClick={() => object.parts !== undefined && onEditParts(object.parts)}
                  />
                )}
                <Button.Root
                  variant={placing === object.id ? 'primary' : 'ghost'}
                  iconOnly
                  icon='ph--plus--regular'
                  label='Place'
                  data-testid={`library-${object.id}-place`}
                  onClick={() => onPlace(object.id)}
                />
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        </OrderedList.Viewport>
        <OrderedList.Empty>No objects. Select elements and choose Make object.</OrderedList.Empty>
      </>
    )}
  </OrderedList.Root>
);
