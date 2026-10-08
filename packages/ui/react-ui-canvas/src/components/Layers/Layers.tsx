//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Editable from '@dxos/react-ui/Editable';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type Layer, type LayerId } from '../../model/types.ts';

export type LayersPanelProps = Util.ThemedClassName<{
  /** The scene's layers, bottom first (`sceneLayers`); the panel lists them top first, as they stack. */
  layers: readonly Layer[];
  /** The layer new shapes go on. */
  active?: LayerId;
  readonly?: boolean;
  onActiveChange?: (id: LayerId) => void;
  /** Shows or hides a layer. */
  onToggle?: (id: LayerId) => void;
  onRename?: (id: LayerId, name: string) => void;
  /** Moves a layer to `index` in the bottom-first order. */
  onMove?: (id: LayerId, index: number) => void;
  /** Adds a layer; the panel opens the name of the one whose id it returns. */
  onCreate?: () => LayerId | void;
  /** Removes a layer and its shapes; offered while there is more than one. */
  onDelete?: (id: LayerId) => void;
  /** Merges a layer into the one below it; offered for every layer but the bottom one. */
  onMerge?: (id: LayerId) => void;
}>;

type LayerNameProps = {
  layer: Layer;
  readonly?: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onRename?: (name: string) => void;
};

/**
 * A layer's name, edited in place on a double-click (`Editable`: the input takes the preview's cell, so the row does
 * not move). Enter or leaving it commits, Escape keeps the old name. It is the row's text part, so it carries that
 * part's class for the row's layout.
 */
const LayerName = ({ layer, readonly, editing, onEditingChange, onRename }: LayerNameProps) => (
  <Editable.Root
    classNames='dx-listbox-item-text'
    value={layer.name}
    activation='dblclick'
    editing={editing}
    onEditingChange={onEditingChange}
    disabled={readonly || !onRename}
    onValueChange={(next) => {
      const name = next.trim();
      if (name && name !== layer.name) {
        onRename?.(name);
      }
    }}
  >
    <Editable.Preview data-testid={`layer-name-${layer.id}`} />
    <Editable.Input
      aria-label='Layer name'
      data-testid={`layer-input-${layer.id}`}
      // While a name is typed, the list's keys (typeahead, arrows, selection) must not take its keys; otherwise the
      // list keeps them, so the arrows move between rows.
      onKeyDown={(event) => event.stopPropagation()}
    />
  </Editable.Root>
);

/**
 * A scene's layers, top first as they stack: the active one is selected, each shows or hides from its eye, renames on
 * a double-click and reorders by its handle. The toolbar adds a layer, deletes the active one, and merges it down.
 */
export const LayersPanel = ({
  classNames,
  layers,
  active: activeProp,
  readonly,
  onActiveChange,
  onToggle,
  onRename,
  onMove,
  onCreate,
  onDelete,
  onMerge,
}: LayersPanelProps) => {
  const items = useMemo(() => [...layers].reverse(), [layers]);
  // The row whose name is open; a new layer opens its own, so it is named as it is made.
  const [editingId, setEditingId] = useState<LayerId>();
  const active = layers.find((layer) => layer.id === activeProp) ?? layers[layers.length - 1];
  const bottom = layers[0];
  return (
    <div className={mx('flex flex-col overflow-hidden', classNames)} data-testid='layers'>
      <Toolbar.Root data-testid='layers-toolbar'>
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--plus--regular'
          label='Add layer'
          disabled={readonly || !onCreate}
          data-testid='layers-create'
          onClick={() => {
            const id = onCreate?.();
            if (id) {
              setEditingId(id);
            }
          }}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--trash--regular'
          label='Delete layer'
          disabled={readonly || !onDelete || !active || layers.length < 2}
          data-testid='layers-delete'
          onClick={() => active && onDelete?.(active.id)}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--arrow-line-down--regular'
          label='Merge down'
          disabled={readonly || !onMerge || !active || active.id === bottom?.id}
          data-testid='layers-merge'
          onClick={() => active && onMerge?.(active.id)}
        />
      </Toolbar.Root>
      <OrderedList.Root
        items={items}
        getLabel={(layer) => layer.name}
        readonly={readonly || !onMove}
        value={active?.id}
        onValueChange={(id) => onActiveChange?.(id)}
        // The list is top first; the order the model keeps is bottom first.
        onMove={(from, to) => onMove?.(items[from].id, items.length - 1 - to)}
      >
        {({ items }) => (
          <OrderedList.Content aria-label='Layers'>
            {items.map((layer) => (
              <OrderedList.Item key={layer.id} id={layer.id} data-testid={`layer-${layer.id}`}>
                <OrderedList.DragHandle />
                <LayerName
                  layer={layer}
                  readonly={readonly}
                  editing={editingId === layer.id}
                  onEditingChange={(editing) =>
                    setEditingId((current) => (editing ? layer.id : current === layer.id ? undefined : current))
                  }
                  onRename={(name) => onRename?.(layer.id, name)}
                />
                <Button.Root
                  variant='ghost'
                  iconOnly
                  icon={layer.hidden ? 'ph--eye-slash--regular' : 'ph--eye--regular'}
                  label={layer.hidden ? 'Show layer' : 'Hide layer'}
                  disabled={readonly || !onToggle}
                  data-testid={`layer-toggle-${layer.id}`}
                  onClick={(event) => {
                    // The row's own click selects it; showing or hiding a layer leaves the active one alone.
                    event.stopPropagation();
                    onToggle?.(layer.id);
                  }}
                />
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
    </div>
  );
};
