//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useState } from 'react';

import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Editable from '@dxos/react-ui/Editable';
import * as Menu from '@dxos/react-ui/Menu';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { type SceneId } from '../../../model/index.ts';
import { InspectorMenu } from '../InspectorMenu/index.ts';

/** A composite as the panel lists it. */
export type ObjectEntry = { id: SceneId; name: string; instances: number };

export type ObjectsPanelProps = Util.ThemedClassName<{
  objects: readonly ObjectEntry[];
  /** The composite open in isolation, or the one whose instance is selected. */
  selected?: SceneId;
  readonly?: boolean;
  /** Opens a composite in isolation. */
  onSelect?: (id: SceneId) => void;
  onRename?: (id: SceneId, name: string) => void;
  /** Groups the canvas selection as a new object; absent while nothing on the canvas is selected. */
  onCompose?: () => void;
  /** Places an instance of the selected composite on the canvas. */
  onPlace?: (id: SceneId) => void;
  onDuplicate?: (id: SceneId) => void;
  /** Removes a composite; with `instances`, the instances of it too. */
  onDelete?: (id: SceneId, instances: boolean) => void;
  /** A small picture of a composite, drawn after its name. */
  thumbnail?: (id: SceneId) => ReactNode;
  /** Gives the scene a timeline; absent while it has one or cannot be edited. */
  onAnimate?: () => void;
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
}>;

/**
 * The drawing's composite objects (ANIMATION.md §4.3), built like `LayersPanel`: a row per composite with a drag handle,
 * its name (renamed in place on a double-click), a thumbnail and its number of instances. Selecting a row opens the composite in
 * isolation. The toolbar groups the canvas selection as an object, places, animates the scene, duplicates and deletes.
 */
export const ObjectsPanel = ({
  classNames,
  objects,
  selected,
  readonly,
  onSelect,
  onRename,
  onCompose,
  onPlace,
  onDuplicate,
  onDelete,
  thumbnail,
  onAnimate,
  docked = false,
  onDockedChange,
}: ObjectsPanelProps) => {
  const [editingId, setEditingId] = useState<SceneId>();
  const current = objects.find((entry) => entry.id === selected);
  return (
    <Panel.Root classNames={classNames} data-testid='objects'>
      <Panel.Header asChild>
        <Toolbar.Root data-testid='objects-toolbar'>
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--selection-plus--regular'
            label='Group selection as object'
            disabled={readonly || !onCompose}
            data-testid='objects-compose'
            onClick={onCompose}
          />
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--stamp--regular'
            label='Place object'
            disabled={readonly || !current || !onPlace}
            data-testid='objects-place'
            onClick={() => current && onPlace?.(current.id)}
          />
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
          <InspectorMenu docked={docked} onDockedChange={onDockedChange} data-testid='objects-menu'>
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
      </Panel.Header>
      <Panel.Body>
        <OrderedList.Root
          items={objects}
          getLabel={(entry) => entry.name}
          readonly
          value={selected}
          onValueChange={(id) => onSelect?.(id)}
        >
          {({ items }) => {
            const content = (
              <OrderedList.Content gutter='none' aria-label='Objects'>
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
                      <Editable.Preview classNames='px-0 cursor-pointer' data-testid={`object-name-${entry.id}`} />
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
            return docked ? content : <OrderedList.Viewport>{content}</OrderedList.Viewport>;
          }}
        </OrderedList.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
