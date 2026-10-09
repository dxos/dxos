//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { OrderedList } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Editable from '@dxos/react-ui/Editable';
import * as Menu from '@dxos/react-ui/Menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type Layer, type LayerId } from '../../model/types.ts';

export type LayersPanelProps = Util.ThemedClassName<{
  /** The scene's layers, bottom first (`sceneLayers`); the panel lists them top first, as they stack. */
  layers: readonly Layer[];
  /** The selected layers; the top-most of them is the one new shapes go on. */
  selected?: readonly LayerId[];
  readonly?: boolean;
  onSelectedChange?: (ids: LayerId[]) => void;
  /** Shows or hides a layer. */
  onToggle?: (id: LayerId) => void;
  onRename?: (id: LayerId, name: string) => void;
  /** Moves a layer to `index` in the bottom-first order. */
  onMove?: (id: LayerId, index: number) => void;
  /** Adds a layer; the panel opens the name of the one whose id it returns. */
  onCreate?: () => LayerId | void;
  /** Removes the selected layers and their shapes; offered while at least one layer would remain. */
  onDelete?: (ids: LayerId[]) => void;
  /** Merges the selected layers into the top-most of them; offered while two or more are selected. */
  onMerge?: (ids: LayerId[], into: LayerId) => void;
  /** Whether the panel is docked beside the canvas. */
  docked?: boolean;
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
  selected: selectedProp,
  readonly,
  onSelectedChange,
  onToggle,
  onRename,
  onMove,
  onCreate,
  onDelete,
  onMerge,
  docked = false,
}: LayersPanelProps) => {
  const items = useMemo(() => [...layers].reverse(), [layers]);
  // The row whose name is open; a new layer opens its own, so it is named as it is made.
  const [editingId, setEditingId] = useState<LayerId>();
  // Bottom first, as `layers`, so the last is the top-most selected.
  const selected = useMemo(
    () => layers.filter((layer) => selectedProp?.includes(layer.id)).map((layer) => layer.id),
    [layers, selectedProp],
  );
  const top = selected[selected.length - 1];
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
        {/* The rarer, destructive edits wait in a menu at the toolbar's end. */}
        <Toolbar.Separator variant='gap' />
        <Menu.Root positioning={{ placement: 'bottom-end', gutter: 4 }}>
          <Menu.Trigger asChild>
            <Button.Root
              variant='ghost'
              iconOnly
              icon='ph--dots-three-vertical--regular'
              label='Layer actions'
              disabled={readonly}
              data-testid='layers-menu'
            />
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Item
              item={{ value: 'merge', label: 'Merge layers', icon: 'ph--arrow-line-down--regular' }}
              disabled={!onMerge || selected.length < 2}
              data-testid='layers-merge'
              onSelect={() => top && onMerge?.(selected, top)}
            />
            <Menu.Item
              item={{ value: 'delete', label: 'Delete layers', icon: 'ph--trash--regular' }}
              disabled={!onDelete || selected.length === 0 || selected.length >= layers.length}
              data-testid='layers-delete'
              onSelect={() => onDelete?.(selected)}
            />
          </Menu.Content>
        </Menu.Root>
      </Toolbar.Root>
      <OrderedList.Root
        items={items}
        getLabel={(layer) => layer.name}
        readonly={readonly || !onMove}
        multiple
        value={selected}
        onValueChange={(ids) => onSelectedChange?.(ids)}
        // The list is top first; the order the model keeps is bottom first.
        onMove={(from, to) => onMove?.(items[from].id, items.length - 1 - to)}
      >
        {({ items }) => (
          <OrderedList.Content
            // Docked, the dock scrolls the panels together, so the list keeps no scroll of its own (it would hold the wheel).
            scroll={!docked}
            // Its own gutter even without its own scroll, so the block padding below applies either way.
            gutter='inset'
            aria-label='Layers'
            // The gutter frames the rows above and below as well as at the sides.
            padBlock
            onKeyDown={(event) => {
              // Enter on the list (as well as selecting the highlighted row) opens that row's name.
              if (event.key !== 'Enter' || event.target !== event.currentTarget || readonly || !onRename) {
                return;
              }
              const active = event.currentTarget.getAttribute('aria-activedescendant');
              const id = active ? event.currentTarget.ownerDocument.getElementById(active)?.dataset.value : undefined;
              if (id) {
                setEditingId(id);
              }
            }}
          >
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
                    // The row's own click selects it; showing or hiding a layer leaves the selection alone.
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
