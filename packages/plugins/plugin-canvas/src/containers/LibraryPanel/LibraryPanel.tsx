//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type Scene } from '@dxos/scene';

import { CanvasNamespace } from '../../namespace.ts';

export type LibraryPanelProps = {
  /** The canvas model's objects. */
  objects: readonly (Scene.Object2D | Scene.Object3D)[];
  /** The object the place tool is putting down, if any. */
  placing?: string;
  onPlace: (id: string) => void;
  /** Opens a composite object's parts layout. */
  onEditParts: (layout: string) => void;
  /** A locked canvas lists its objects but places and edits none. */
  readonly?: boolean;
};

/** The canvas model's objects: each places with a click, and a composite's parts open for editing. */
export const LibraryPanel = ({ objects, placing, onPlace, onEditParts, readonly = false }: LibraryPanelProps) => {
  const { t } = UiHooks.useTranslation(CanvasNamespace.key);
  return (
    <OrderedList.Root items={objects} getLabel={(object) => object.id} readonly>
      {({ items }) => (
        <>
          <OrderedList.Viewport>
            <OrderedList.Content data-testid='library'>
              {items.map((object) => (
                <OrderedList.Item key={object.id} id={object.id} canDrag={false} data-testid={`library-${object.id}`}>
                  <OrderedList.ItemIcon icon={object.parts ? 'ph--stack--regular' : 'ph--cube--regular'} />
                  <OrderedList.ItemText />
                  <OrderedList.ItemDescription>{object.kind}</OrderedList.ItemDescription>
                  {!readonly && object.parts !== undefined && (
                    <Button.Root
                      variant='ghost'
                      iconOnly
                      icon='ph--pencil-simple--regular'
                      label={t('library.edit-parts.label')}
                      data-testid={`library-${object.id}-edit`}
                      onClick={() => object.parts !== undefined && onEditParts(object.parts)}
                    />
                  )}
                  {!readonly && (
                    <Button.Root
                      variant={placing === object.id ? 'primary' : 'ghost'}
                      iconOnly
                      icon='ph--plus--regular'
                      label={t('library.place.label')}
                      data-testid={`library-${object.id}-place`}
                      onClick={() => onPlace(object.id)}
                    />
                  )}
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          </OrderedList.Viewport>
          <OrderedList.Empty>{t('library.empty.message')}</OrderedList.Empty>
        </>
      )}
    </OrderedList.Root>
  );
};
