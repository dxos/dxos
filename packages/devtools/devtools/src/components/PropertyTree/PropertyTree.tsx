//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { raise } from '@dxos/debug';
import { type Database, Entity, Filter, Query } from '@dxos/echo';
import { EID, type EntityId } from '@dxos/keys';
import { Tree, type TreeItemDataProps, type TreeModel, type TreeNode } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import { mx } from '@dxos/ui-theme';

export type PropertyTreeProps = {
  /** The value to inspect; serialized through `JSON.stringify`, so an ECHO object shows its `toJSON` shape. */
  value: unknown;
  /** Resolves references; without it a reference is a leaf. */
  db?: Database.Database;
  /** Levels of objects and arrays open on first render; references stay closed, since opening one runs a query. */
  defaultDepth?: number;
  /** Selects the referenced entity elsewhere (e.g. in the objects list). */
  onNavigate?: (id: EntityId) => void;
};

/**
 * A JSON value as a disclosure tree. A reference (`{ "/": uri }`) is a branch whose children are the
 * target's own properties, queried only once the row is shown, so a cyclic or unbounded graph is
 * walked one opened level at a time rather than serialized whole.
 */
export const PropertyTree = ({ value, db, defaultDepth = 2, onNavigate }: PropertyTreeProps) => {
  const registry = useContext(RegistryContext);
  const json = useMemo(() => toJson(value), [value]);
  const model = useMemo(() => new PropertyTreeModel(json, db, defaultDepth), [json, db, defaultDepth]);
  const contextValue = useMemo(() => ({ model, onNavigate }), [model, onNavigate]);

  const handleOpenChange = useCallback(
    ({ item, open }: { item: PropertyNode; open: boolean }) => registry.set(model.open(item.id), open),
    [model, registry],
  );

  return (
    <PropertyTreeContext.Provider value={contextValue}>
      <Tree.Root
        id='properties'
        model={model.treeModel}
        columns='var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content'
        onOpenChange={handleOpenChange}
      >
        <Tree.Content>{renderRow}</Tree.Content>
      </Tree.Root>
    </PropertyTreeContext.Provider>
  );
};

PropertyTree.displayName = 'PropertyTree';

const renderRow = (node: TreeNode<PropertyNode>) =>
  node.item ? (
    <Tree.Item node={node}>
      <Tree.ItemIndicator />
      <Tree.ItemIcon />
      <Tree.ItemText>
        <PropertyRow item={node.item} />
      </Tree.ItemText>
      <PropertyActions item={node.item} />
    </Tree.Item>
  ) : null;

/** Key, then a one-line preview of the value; a reference previews its target's label. */
const PropertyRow = ({ item }: { item: PropertyNode }) => {
  const { model } = useContext(PropertyTreeContext) ?? raise(new Error('PropertyTreeContext not found'));
  const target = useAtomValue(model.target(item.id));
  return (
    <span className='flex gap-2 min-w-0 font-mono text-sm'>
      <span className='shrink-0 text-fg-subtle'>{item.key}</span>
      <span className={mx('truncate', VALUE_CLASSES[item.kind])}>{preview(item, target)}</span>
    </span>
  );
};

const PropertyActions = ({ item }: { item: PropertyNode }) => {
  const { onNavigate } = useContext(PropertyTreeContext) ?? raise(new Error('PropertyTreeContext not found'));
  const id = item.kind === 'ref' ? getRefEntityId(item.value) : undefined;
  if (!id || !onNavigate) {
    return <span role='none' />;
  }

  return (
    <Tree.ItemActions>
      <Button.Root
        variant='ghost'
        icon='ph--arrow-square-right--regular'
        iconOnly
        label='Select object'
        data-testid='property-tree.navigate'
        onClick={() => onNavigate(id)}
      />
    </Tree.ItemActions>
  );
};

type PropertyTreeContextValue = {
  model: PropertyTreeModel;
  onNavigate?: (id: EntityId) => void;
};

const PropertyTreeContext = createContext<PropertyTreeContextValue | null>(null);

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type PropertyKind = 'object' | 'array' | 'ref' | 'string' | 'number' | 'boolean' | 'null';

export type PropertyNode = {
  /** The path from the root, which is unique where the same value appears twice. */
  id: string;
  key: string;
  kind: PropertyKind;
  value: JsonValue;
};

/** Resolved reference target, as the row previews it and its children read it. */
type RefTarget = { label: string; icon?: string; json: JsonValue } | undefined;

const ROOT_ID = 'root';

// Ids are joined by a character `encodeURIComponent` always escapes, so no key can forge a path; the tree joins rows by `+`, which it escapes too.
const childId = (parentId: string, key: string) => `${parentId}/${encodeURIComponent(key)}`;

class PropertyTreeModel {
  readonly #db?: Database.Database;
  readonly #root: PropertyNode;
  readonly #defaultDepth: number;

  constructor(json: JsonValue, db?: Database.Database, defaultDepth = 0) {
    this.#db = db;
    this.#root = makeNode(ROOT_ID, '', json);
    this.#defaultDepth = defaultDepth;
  }

  /** The row's explicit open state, as the user toggled it; unset rows follow the default depth. */
  open(id: string): Atom.Writable<boolean | undefined> {
    return this.#toggled(id);
  }

  /** The target of the reference at `id`, or undefined for any other node (or a dangling reference). */
  target(id: string): Atom.Atom<RefTarget> {
    return this.#target(id);
  }

  get treeModel(): TreeModel<PropertyNode> {
    return {
      childIds: (parentId?: string) => this.#childIds(parentId ?? ROOT_ID),
      item: (id: string) => this.#item(id),
      itemProps: (path: string[]) => this.#itemProps(path.at(-1) ?? ROOT_ID),
      itemOpen: (path: string[]) => this.#open(path.at(-1) ?? ROOT_ID),
      itemCurrent: () => NEVER_CURRENT,
    };
  }

  #toggled = Atom.family((_id: string) => Atom.make<boolean | undefined>(undefined));

  #open = Atom.family((id: string) =>
    Atom.make((get): boolean => {
      const toggled = get(this.#toggled(id));
      if (toggled !== undefined) {
        return toggled;
      }
      const node = get(this.#item(id));
      // The root is depth 0, and each `/` in the id is one level below it.
      const depth = id.split('/').length - 1;
      return (
        node !== undefined &&
        node.kind !== 'ref' &&
        depth >= 1 &&
        depth <= this.#defaultDepth &&
        get(this.#children(id)).length <= MAX_DEFAULT_OPEN_ENTRIES
      );
    }),
  );

  /** A node is read from its parent's children, so it follows the parent's value (or reference target) as it changes. */
  #item = Atom.family((id: string) =>
    Atom.make((get): PropertyNode | undefined => {
      if (id === ROOT_ID) {
        return this.#root;
      }
      const parentId = id.slice(0, id.lastIndexOf('/'));
      return get(this.#children(parentId)).find((child) => child.id === id);
    }),
  );

  /** Only a reference is gated on being open: plain JSON is finite, but a reference's children are a query. */
  #childIds = Atom.family((id: string) =>
    Atom.make((get): string[] => {
      const node = get(this.#item(id));
      if (node?.kind === 'ref' && !get(this.#open(id))) {
        return [];
      }
      return get(this.#children(id)).map((child) => child.id);
    }),
  );

  #children = Atom.family((id: string) =>
    Atom.make((get): PropertyNode[] => {
      const node = get(this.#item(id));
      const value = node?.kind === 'ref' ? get(this.#target(id))?.json : node?.value;
      return entries(value).map(([key, child]) => makeNode(childId(id, key), key, child));
    }),
  );

  #itemProps = Atom.family((id: string) =>
    Atom.make((get): TreeItemDataProps => {
      const node = get(this.#item(id));
      // Read one level ahead (as `ObjectsTree` does), so a closed reference still draws its toggle.
      const children = get(this.#children(id));
      const target = get(this.#target(id));
      return {
        id,
        label: node?.key ?? id,
        icon: target?.icon ?? (node ? ICONS[node.kind] : undefined),
        ...(children.length > 0 && { parentOf: children.map((child) => child.id) }),
      };
    }),
  );

  #target = Atom.family((id: string) =>
    Atom.make((get): RefTarget => {
      const node = get(this.#item(id));
      const entityId = node?.kind === 'ref' ? getRefEntityId(node.value) : undefined;
      return entityId ? get(this.#entity(entityId)) : undefined;
    }),
  );

  /** Keyed by entity, so every reference to one object shares a single query. */
  #entity = Atom.family((entityId: EntityId) => {
    if (!this.#db) {
      return Atom.make<RefTarget>(undefined);
    }

    const entities = this.#db.query(
      Query.select(Filter.id(entityId)).options({ deleted: 'include' }).from(this.#db),
    ).atom;
    return Atom.make((get): RefTarget => {
      const entity = get(entities)[0];
      if (!entity) {
        return undefined;
      }
      // Read through the entity's atom so an edit to the target re-renders the rows showing it.
      const snapshot = get(Entity.atom(entity));
      return {
        label: Entity.getLabel(snapshot) ?? Entity.getTypename(snapshot) ?? entity.id,
        icon: Entity.getIcon(snapshot)?.icon,
        json: toJson(entity),
      };
    });
  });
}

const NEVER_CURRENT = Atom.make(false);

/** A larger container (e.g. a blob's inline bytes) stays closed by default, so it does not bury its siblings. */
const MAX_DEFAULT_OPEN_ENTRIES = 20;

/** Only structure gets a glyph; a primitive's value is already its own signal, and an icon per leaf is noise. */
const ICONS: Partial<Record<PropertyKind, string>> = {
  object: 'ph--brackets-curly--regular',
  array: 'ph--brackets-square--regular',
  ref: 'ph--link--regular',
};

const VALUE_CLASSES: Record<PropertyKind, string> = {
  object: 'text-fg-subtle',
  array: 'text-fg-subtle',
  ref: 'text-accent-text',
  string: 'text-green-text',
  number: 'text-sky-text',
  boolean: 'text-amber-text',
  null: 'text-fg-subtle',
};

const toJson = (value: unknown): JsonValue => {
  try {
    return JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return String(value);
  }
};

const isRecord = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** ECHO serializes a reference as `{ "/": uri }`. */
const isRef = (value: JsonValue): boolean =>
  isRecord(value) && Object.keys(value).length === 1 && typeof value['/'] === 'string';

const getRefEntityId = (value: JsonValue): EntityId | undefined => {
  if (!isRef(value) || !isRecord(value) || typeof value['/'] !== 'string') {
    return undefined;
  }
  const eid = EID.tryParse(value['/']);
  return eid ? EID.getEntityId(eid) : undefined;
};

const kindOf = (value: JsonValue): PropertyKind => {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (isRef(value)) {
    return 'ref';
  }
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'object';
  }
};

const makeNode = (id: string, key: string, value: JsonValue): PropertyNode => ({
  id,
  key,
  kind: kindOf(value),
  value,
});

const entries = (value: JsonValue | undefined): [string, JsonValue][] => {
  if (Array.isArray(value)) {
    return value.map((child, index) => [String(index), child]);
  }
  if (value !== undefined && isRecord(value) && !isRef(value)) {
    return Object.entries(value);
  }
  return [];
};

const preview = (node: PropertyNode, target: RefTarget): string => {
  const { value } = node;
  switch (node.kind) {
    case 'ref':
      return target?.label ?? (isRecord(value) ? String(value['/']) : '');
    case 'array':
      return Array.isArray(value) ? `[${value.length}]` : '';
    case 'object':
      return isRecord(value) ? `{${Object.keys(value).length}}` : '';
    case 'string':
      return JSON.stringify(value);
    default:
      return String(value);
  }
};
