//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useState } from 'react';

import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Editable from '@dxos/react-ui/Editable';
import * as Menu from '@dxos/react-ui/Menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type ViewId } from '../../../model/index.ts';
import { InspectorMenu } from '../InspectorMenu/index.ts';
import { type InspectorProps } from '../types.ts';

/** A composite as the panel lists it; an anonymous one (a group not yet named) is listed only while selected. */
export type ObjectEntry = { id: ViewId; name: string; instances: number; anonymous?: boolean };

export type ObjectsInspectorProps = InspectorProps & {
  objects: readonly ObjectEntry[];
  /** The composite open in isolation, or the one whose instance is selected. */
  selected?: ViewId;
  /** Opens a composite in isolation. */
  onSelect?: (id: ViewId) => void;
  onRename?: (id: ViewId, name: string) => void;
  /** Places an instance of the selected composite on the canvas. */
  onPlace?: (id: ViewId) => void;
  onDuplicate?: (id: ViewId) => void;
  /** Removes a composite; with `instances`, the instances of it too. */
  onDelete?: (id: ViewId, instances: boolean) => void;
  /** A small picture of a composite, drawn after its name. */
  thumbnail?: (id: ViewId) => ReactNode;
  /** Gives the scene a timeline; absent while it has one or cannot be edited. */
  onAnimate?: () => void;
  /** Makes an object of the canvas selection (in 2D, Group does this); absent where nothing can be made. */
  onMakeObject?: () => void;
  /** Whether the selection can become an object now. */
  canMakeObject?: boolean;
  /** Defines an object from a mesh file; absent where meshes are not offered. */
  onImport?: () => void;
};

/**
 * The drawing's composite objects (ANIMATION.md §4.3), built like `LayersInspector`: a row per composite with a drag handle,
 * its name (renamed in place on a double-click), a thumbnail and its number of instances. Selecting a row opens the composite in
 * isolation. The toolbar places, animates the scene, duplicates and deletes; Group on the canvas makes new objects.
 */
export const ObjectsInspector = ({
  classNames,
  objects,
  selected,
  readonly,
  onSelect,
  onRename,
  onPlace,
  onMakeObject,
  canMakeObject = true,
  onImport,
  onDuplicate,
  onDelete,
  thumbnail,
  onAnimate,
}: ObjectsInspectorProps) => {
  const [editingId, setEditingId] = useState<ViewId>();
  const current = objects.find((entry) => entry.id === selected);
  return (
    <>
      <Toolbar.Root data-testid='objects-toolbar'>
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--stamp--regular'
          label='Place object'
          disabled={readonly || !current || !onPlace}
          data-testid='objects-place'
          onClick={() => current && onPlace?.(current.id)}
        />
        {onMakeObject && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--package--regular'
            label='Make object'
            disabled={readonly || !canMakeObject}
            data-testid='objects-make'
            onClick={onMakeObject}
          />
        )}
        {onImport && (
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--upload-simple--regular'
            label='Import mesh'
            disabled={readonly}
            data-testid='objects-import'
            onClick={onImport}
          />
        )}
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--film-strip--regular'
          label='Animate'
          disabled={!onAnimate}
          data-testid='objects-animate'
          onClick={onAnimate}
        />
        <Toolbar.Separator variant='gap' />
        <InspectorMenu data-testid='objects-menu'>
          <Menu.Item
            item={{ value: 'duplicate', label: 'Duplicate object', icon: 'ph--copy--regular' }}
            disabled={readonly || !current || !onDuplicate}
            data-testid='objects-duplicate'
            onSelect={() => current && onDuplicate?.(current.id)}
          />
          <Menu.Item
            item={{ value: 'delete', label: 'Delete object', icon: 'ph--trash--regular' }}
            disabled={readonly || !current || current.instances > 0 || !onDelete}
            data-testid='objects-delete'
            onSelect={() => current && onDelete?.(current.id, false)}
          />
          <Menu.Item
            item={{ value: 'delete-all', label: 'Delete object and its instances', icon: 'ph--trash--regular' }}
            disabled={readonly || !current || !onDelete}
            data-testid='objects-delete-all'
            onSelect={() => current && onDelete?.(current.id, true)}
          />
        </InspectorMenu>
      </Toolbar.Root>
      <OrderedList.Root
        items={objects}
        getLabel={(entry) => entry.name}
        readonly
        value={selected}
        onValueChange={(id) => onSelect?.(id)}
      >
        {({ items }) => {
          const content = (
            <OrderedList.Content classNames={classNames} data-testid='objects' gutter='none' aria-label='Objects'>
              {items.map((entry) => (
                <OrderedList.Item
                  key={entry.id}
                  id={entry.id}
                  classNames='cursor-pointer'
                  data-testid={`object-${entry.id}`}
                  // The row of a selected instance is already highlighted, so a click on it changes no value: it
                  // opens the object directly.
                  onClick={() => onSelect?.(entry.id)}
                >
                  <OrderedList.DragHandle />
                  <Editable.Root
                    classNames='dx-listbox-item-text'
                    value={entry.name}
                    activation='dblclick'
                    editing={editingId === entry.id}
                    onEditingChange={(editing) =>
                      setEditingId((id) => (editing ? entry.id : id === entry.id ? undefined : id))
                    }
                    disabled={readonly || !onRename}
                    onValueChange={(next) => {
                      const name = next.trim();
                      if (name && name !== entry.name) {
                        onRename?.(entry.id, name);
                      }
                    }}
                  >
                    <Editable.Preview
                      classNames={['px-0 cursor-pointer', entry.anonymous && 'italic text-fg-muted']}
                      data-testid={`object-name-${entry.id}`}
                    />
                    <Editable.Input
                      classNames='-ms-2 w-[calc(100%+0.5rem)] ps-2'
                      aria-label='Object name'
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </Editable.Root>
                  {/* After the name: the leading slot is the row's drag handle, as in the layers. */}
                  <span
                    aria-hidden
                    className='relative shrink-0 w-10 h-6 overflow-hidden rounded-xs border border-separator'
                  >
                    {thumbnail?.(entry.id)}
                  </span>
                  <span className='shrink-0 px-2 text-sm tabular-nums text-fg-muted' title='Instances'>
                    {entry.instances}
                  </span>
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          );
          return content;
        }}
      </OrderedList.Root>
    </>
  );
};
