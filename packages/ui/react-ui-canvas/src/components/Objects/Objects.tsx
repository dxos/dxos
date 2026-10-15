//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Tree, type TreeNode, type TreeSelectEvent, createStaticTreeModel } from '@dxos/react-ui-list';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Editable from '@dxos/react-ui/Editable';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';

import { useRegistry } from '../../hooks/index.ts';
import { type CompoundEntry } from '../../utils/scenes.ts';
import { InspectorMenu } from '../InspectorMenu/index.ts';

/** A row of the tree: a compound object, keyed by its frame path so one scene shown by two frames keeps two rows. */
type ObjectItem = { id: string; entry?: CompoundEntry; children: ObjectItem[] };

const ROOT_ID = 'objects';

const toItem = (entry: CompoundEntry): ObjectItem => ({
  id: entry.path.join('/'),
  entry,
  children: entry.children.map(toItem),
});

/** Disclosure, icon, name, then the enter and visibility controls. */
const COLUMNS = 'var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content min-content';

export type ObjectsPanelProps = Util.ThemedClassName<{
  /** The drawing's compound objects (`compoundTree`). */
  entries: readonly CompoundEntry[];
  /** Whether a row is the selection of the scene the view shows. */
  isSelected?: (entry: CompoundEntry) => boolean;
  readonly?: boolean;
  /** Offered while the selection may be grouped. */
  onGroup?: () => void;
  /** Offered while the selection is one compound object. */
  onUngroup?: () => void;
  /** A row is picked: the view shows its scene, selects it and frames it. */
  onSelect?: (entry: CompoundEntry) => void;
  onEnter?: (entry: CompoundEntry) => void;
  onToggle?: (entry: CompoundEntry) => void;
  onRename?: (entry: CompoundEntry, name: string) => void;
  /** Whether a row may be renamed; a compound object of another drawing may not. */
  isEditable?: (entry: CompoundEntry) => boolean;
  docked?: boolean;
  onDockedChange?: (docked: boolean) => void;
}>;

/**
 * The drawing's compound objects as a tree of nested sub-graphs. A row selects and frames its object; its controls
 * enter it and show or hide it, and a double-click renames it. The toolbar groups the selection into a new compound
 * object, or ungroups the selected one.
 */
export const ObjectsPanel = ({
  classNames,
  entries,
  isSelected,
  readonly,
  onGroup,
  onUngroup,
  onSelect,
  onEnter,
  onToggle,
  onRename,
  isEditable,
  docked = false,
  onDockedChange,
}: ObjectsPanelProps) => {
  const registry = useRegistry();
  // Open state lives outside the model, which is rebuilt with every edit to the drawing; a row is open until closed.
  const openRef = useRef(new Map<string, boolean>());
  const [editingId, setEditingId] = useState<string>();

  const model = useMemo(
    () =>
      createStaticTreeModel<ObjectItem>(
        { id: ROOT_ID, children: entries.map(toItem) },
        {
          getChildren: (item) => item.children,
          getProps: (item) => ({ label: item.entry?.name ?? item.id }),
          isOpen: (_item, path) => openRef.current.get(path.join('/')) ?? true,
          isCurrent: (item) => (item.entry ? (isSelected?.(item.entry) ?? false) : false),
        },
      ),
    [entries, isSelected],
  );

  const handleOpenChange = useCallback(
    ({ path, open }: { path: string[]; open: boolean }) => {
      openRef.current.set(path.join('/'), open);
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), open });
    },
    [model, registry],
  );

  const handleSelect = useCallback(
    ({ item }: TreeSelectEvent<ObjectItem>) => item.entry && onSelect?.(item.entry),
    [onSelect],
  );

  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'group',
          {
            label: 'Group selection',
            icon: 'ph--selection-plus--regular',
            iconOnly: true,
            disabled: readonly || !onGroup,
            testId: 'objects-group',
          },
          () => onGroup?.(),
        )
        .action(
          'ungroup',
          {
            label: 'Ungroup',
            icon: 'ph--selection-slash--regular',
            iconOnly: true,
            disabled: readonly || !onUngroup,
            testId: 'objects-ungroup',
          },
          () => onUngroup?.(),
        )
        .build(),
    [readonly, onGroup, onUngroup],
  );

  const renderRow = useCallback(
    (node: TreeNode<ObjectItem>) => {
      const entry = node.item?.entry;
      if (!entry) {
        return null;
      }
      const id = entry.path.join('/');
      return (
        <Tree.Item node={node}>
          <Tree.ItemIndicator />
          <Tree.ItemIcon icon='ph--cube--regular' />
          <Editable.Root
            value={entry.name}
            activation='dblclick'
            editing={editingId === id}
            onEditingChange={(editing) =>
              setEditingId((current) => (editing ? id : current === id ? undefined : current))
            }
            disabled={readonly || !onRename || isEditable?.(entry) === false}
            onValueChange={(next) => {
              const name = next.trim();
              if (name && name !== entry.name) {
                onRename?.(entry, name);
              }
            }}
          >
            <Editable.Preview data-testid={`object-name-${id}`} />
            <Editable.Input
              aria-label='Object name'
              data-testid={`object-input-${id}`}
              // The tree's keys (typeahead, arrows, selection) must not take a name's keys while it is typed.
              onKeyDown={(event) => event.stopPropagation()}
            />
          </Editable.Root>
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--arrow-square-in--regular'
            label='Open'
            disabled={!onEnter}
            data-testid={`object-enter-${id}`}
            onClick={() => onEnter?.(entry)}
          />
          <Button.Root
            variant='ghost'
            iconOnly
            icon={entry.hidden ? 'ph--eye-slash--regular' : 'ph--eye--regular'}
            label={entry.hidden ? 'Show object' : 'Hide object'}
            disabled={readonly || !onToggle}
            data-testid={`object-toggle-${id}`}
            onClick={() => onToggle?.(entry)}
          />
        </Tree.Item>
      );
    },
    [editingId, readonly, onRename, isEditable, onEnter, onToggle],
  );

  return (
    <Panel.Root classNames={classNames} data-testid='objects'>
      <Panel.Header asChild>
        <ActionToolbar {...menu} alwaysActive data-testid='objects-toolbar'>
          <Toolbar.Separator variant='gap' />
          <InspectorMenu docked={docked} onDockedChange={onDockedChange} data-testid='objects-menu' />
        </ActionToolbar>
      </Panel.Header>
      <Panel.Body>
        <Tree.Root
          id={ROOT_ID}
          model={model}
          size='sm'
          columns={COLUMNS}
          onOpenChange={handleOpenChange}
          onSelect={handleSelect}
        >
          <Tree.Content>{renderRow}</Tree.Content>
          <Tree.Empty icon='ph--cube--regular'>No compound objects</Tree.Empty>
        </Tree.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
