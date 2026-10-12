//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Array from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Match from 'effect/Match';
import * as Order from 'effect/Order';
import * as Atom from 'effect/reactivity/Atom';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import React from 'react';

import { raise } from '@dxos/debug';
import { type Database, Entity, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Tree, type TreeItemDataProps, type TreeModel, type TreeNode } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import { getStyles, hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

export interface ObjectsTreeProps {
  db: Database.Database;
  root?: Entity.Unknown;
  onSelect?: (entity: Entity.Snapshot) => void;
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
  /** Narrows the top-level rows to those whose label contains this text (case-insensitive). */
  filter?: string;
  /** Narrows the top-level rows to these entities (e.g. the matches of a query); all rows when undefined. */
  ids?: ReadonlySet<string>;
  /** Highlights the rows showing this entity. */
  selected?: string;
}

/**
 * The object graph as a tree: every row is an entity, its children the objects and relations
 * reachable from it. One space-wide query lists the rows and tells each whether it has children;
 * only an open node holds a query of its own, so live queries scale with what is open, not with the
 * size of the space. Renders through `Tree`, so disclosure, roving focus and the APG keymap are the machine's.
 */
export const ObjectsTree = ({ db, root, onSelect, onOpen, canOpen, filter, ids, selected }: ObjectsTreeProps) => {
  const [model, setModel] = useState(() => new ObjectsTreeModel(db, root ?? null, onSelect ?? (() => {})));
  useEffect(() => {
    setModel((prev) =>
      prev.database === db && prev.root === (root ?? null)
        ? prev
        : new ObjectsTreeModel(db, root ?? null, onSelect ?? (() => {})),
    );
  }, [db, root]);

  const registry = useContext(RegistryContext);
  useEffect(() => registry.set(model.filter, filter ?? ''), [registry, model, filter]);
  useEffect(() => registry.set(model.ids, ids), [registry, model, ids]);
  useEffect(() => registry.set(model.selected, selected), [registry, model, selected]);
  const contextValue = useMemo(() => ({ model, onOpen, canOpen }), [model, onOpen, canOpen]);

  // The walk is gated by id while rows are addressed by path, so a toggle writes both.
  const handleOpenChange = useCallback(
    ({ item, path, open }: { item: ObjectsTreeItem; path: string[]; open: boolean }) => {
      registry.set(model.openAtPath(path), open);
      const openPaths = model.openPaths(item.id);
      const next = new Set(registry.get(openPaths));
      if (open) {
        next.add(path.join('/'));
      } else {
        next.delete(path.join('/'));
      }
      registry.set(openPaths, next);
    },
    [model, registry],
  );

  const handleSelect = useCallback(({ item }: { item: ObjectsTreeItem }) => model.onSelect(item.entity), [model]);

  return (
    <ObjectsTreeContext.Provider value={contextValue}>
      <Tree.Root
        id={ROOT_ANCHOR}
        model={model.treeModel}
        // `minmax(0, 1fr)`, not `1fr`: a bare `1fr` is `minmax(auto, 1fr)`, whose automatic minimum is the content's
        // min-content width, so a long relation typename on a deep row would widen the track and push the trailing
        // column instead of truncating. The role shares the actions' track: a `min-content` column of its own is sized
        // from the widest role across every row, so opening a node whose child has a role shifted every row's button.
        columns='var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content'
        onOpenChange={handleOpenChange}
        onSelect={handleSelect}
      >
        <Tree.Content>{renderRow}</Tree.Content>
      </Tree.Root>
    </ObjectsTreeContext.Provider>
  );
};

/** A row: the relation direction and the entity's glyph, its label, then its role and action menu. */
const renderRow = (node: TreeNode<ObjectsTreeItem>) =>
  node.item ? (
    <Tree.Item node={node}>
      <Tree.ItemIndicator />
      <Tree.ItemIcon>
        <ObjectsTreeIcon item={node.item} path={node.path} />
      </Tree.ItemIcon>
      <Tree.ItemText />
      <ObjectsTreeColumns item={node.item} path={node.path} />
    </Tree.Item>
  ) : null;

type ObjectsTreeRowProps = { item: ObjectsTreeItem; path: string[] };

/** Relation direction arrow plus the entity's own glyph, which a static icon name cannot express. */
const ObjectsTreeIcon = ({ item, path }: ObjectsTreeRowProps) => {
  const { model } = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const scoped = useAtomValue(model.itemAt(path)) ?? item;
  const styles = scoped.iconHue ? getStyles(scoped.iconHue) : undefined;
  return (
    <>
      {scoped.type === 'outgoing-relation' && (
        <Icon.Icon icon='ph--arrow-right--regular' classNames='w-4 h-4 opacity-70' />
      )}
      {scoped.type === 'incoming-relation' && (
        <Icon.Icon icon='ph--arrow-left--regular' classNames='w-4 h-4 opacity-70' />
      )}
      <Icon.Icon icon={scoped.icon} classNames={['w-4 h-4', styles?.text]} />
    </>
  );
};

/** Trailing column: the reference key this entity is held under, and the per-row action menu. */
const ObjectsTreeColumns = ({ item, path }: ObjectsTreeRowProps) => {
  const { model, onOpen, canOpen } = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const node = useAtomValue(model.itemAt(path)) ?? item;

  const showOpen =
    onOpen != null && !node.deleted && node.type === 'object' && (canOpen == null || canOpen(node.entity));
  const handleOpen = useCallback(async () => {
    const obj = await model.database.query(Query.select(Filter.id(node.id))).first();
    if (obj && Obj.isObject(obj)) {
      onOpen?.(obj);
    }
  }, [node.id, model.database, onOpen]);

  const handleCopyDXN = useCallback(() => {
    void navigator.clipboard.writeText(Entity.getURI(node.entity) ?? '');
  }, [node.entity]);
  const handleCopyJSON = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(node.entity, null, 2));
  }, [node.entity]);
  const handlePrintToConsole = useCallback(async () => {
    const obj = await model.database.query(Query.select(Filter.id(node.id)).options({ deleted: 'include' })).first();
    // eslint-disable-next-line no-console
    console.log(obj);
  }, [node.id, model.database]);
  const handleDelete = useCallback(async () => {
    const obj = await model.database.query(Query.select(Filter.id(node.id)).options({ deleted: 'include' })).first();
    model.database.remove(obj);
    await model.database.flush({ indexes: true });
  }, [node.id, model.database]);
  const handleRestore = useCallback(async () => {
    const obj = await model.database.query(Query.select(Filter.id(node.id)).options({ deleted: 'include' })).first();
    model.database.add(obj);
    await model.database.flush({ indexes: true });
  }, [node.id, model.database]);

  return (
    <div className='flex shrink-0 items-center gap-1'>
      {node.role && <span className='text-fg-subtle text-xs'>{node.role}</span>}
      <Menu.Root>
        <Menu.Trigger asChild>
          <Button.Root
            classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
            variant='ghost'
            icon='ph--dots-three-vertical--regular'
            iconOnly
            label='Actions'
            data-testid='objects-tree.row.actions'
          />
        </Menu.Trigger>
        <Menu.Content>
          {showOpen && (
            <Menu.Item
              onClick={handleOpen}
              item={{ value: 'Open', label: 'Open', icon: 'ph--arrow-square-out--regular' }}
            />
          )}
          {!node.deleted && (
            <Menu.Item onClick={handleDelete} item={{ value: 'Delete', label: 'Delete', icon: 'ph--trash--regular' }} />
          )}
          {node.deleted && (
            <Menu.Item
              onClick={handleRestore}
              item={{ value: 'Restore', label: 'Restore', icon: 'ph--arrow-counter-clockwise--regular' }}
            />
          )}

          <Menu.Separator />
          <Menu.Item
            onClick={handleCopyDXN}
            item={{ value: 'Copy DXN', label: 'Copy DXN', icon: 'ph--copy--regular' }}
          />
          <Menu.Item
            onClick={handleCopyJSON}
            item={{ value: 'Copy JSON', label: 'Copy JSON', icon: 'ph--brackets-curly--regular' }}
          />
          <Menu.Item
            onClick={handlePrintToConsole}
            item={{ value: 'Print to console', label: 'Print to console', icon: 'ph--terminal-window--regular' }}
          />
        </Menu.Content>
      </Menu.Root>
    </div>
  );
};

type ObjectsTreeContextValue = {
  model: ObjectsTreeModel;
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
};
const ObjectsTreeContext = createContext<ObjectsTreeContextValue | null>(null);

export type ObjectsTreeItem = {
  id: string;
  type: 'object' | 'outgoing-relation' | 'incoming-relation';
  deleted: boolean;
  label: string;
  icon: string;
  iconHue?: string;
  /**
   * For children that are also referenced by parents, this is set to the key of the parent.
   */
  role?: string;
  entity: Entity.Snapshot;
};

const ExpandedKeySchema = Schema.TemplateLiteralParser([
  // id
  Schema.String,
  '-',
  // level
  Schema.Number,
]);

/**
 * Every entity in the space, indexed so a row can tell whether it has children without a query of
 * its own. Built from the live entities, not snapshots: reading every snapshot would rebuild the
 * index on each entity's change, which is quadratic while a space loads or syncs. The cost is that a
 * re-parented object updates a closed row's toggle only at the next change to the result set.
 */
type ObjectsGraphIndex = {
  objects: readonly string[];
  byId: ReadonlyMap<string, Entity.Unknown>;
  /** Ids reachable from each anchor: its child objects, the relations it is an end of, and a relation's two ends. */
  reachable: ReadonlyMap<string, readonly string[]>;
};

/** @internal Exported for tests. */
export class ObjectsTreeModel {
  #onSelect: (entity: Entity.Snapshot) => void;
  #database: Database.Database;
  #root: Entity.Unknown | null;
  #atoms = Atom.family((anchor: string | null) => this.#makeNodeAtom(anchor));
  /** The one query every row shares; per-anchor queries are reserved for open nodes. */
  #graph: Atom.Atom<ObjectsGraphIndex>;
  #expandedState = Atom.family((_key: string) => Atom.make(false));
  /** Top-level label filter, set by the component's `filter` prop. */
  readonly filter = Atom.make('');
  /** Top-level id filter, set by the component's `ids` prop. */
  readonly ids = Atom.make<ReadonlySet<string> | undefined>(undefined);
  /** Highlighted entity, set by the component's `selected` prop. */
  readonly selected = Atom.make<string | undefined>(undefined);

  constructor(database: Database.Database, root: Entity.Unknown | null, onSelect: (entity: Entity.Snapshot) => void) {
    this.#database = database;
    this.#root = root;
    this.#onSelect = onSelect;
    const entities: Atom.Atom<Entity.Unknown[]> = database.query(
      Query.select(Filter.everything()).options({ deleted: 'include' }).from(database),
    ).atom;
    this.#graph = Atom.make((get) => buildGraphIndex(get(entities)));
  }

  get database(): Database.Database {
    return this.#database;
  }

  get root(): Entity.Unknown | null {
    return this.#root;
  }

  get rootNodes(): Atom.Atom<ObjectsTreeItem[]> {
    return this.#atoms(null);
  }

  onSelect(entity: Entity.Snapshot): void {
    this.#onSelect(entity);
  }

  getChildren(id: string): Atom.Atom<ObjectsTreeItem[]> {
    return this.#atoms(id);
  }

  expanded(id: string, level: number): Atom.Writable<boolean> {
    return this.#expandedState(Schema.encodeSync(ExpandedKeySchema)([id, '-', level]));
  }

  /** Open state keyed by the tree's path, which is what `Tree` addresses rows by. */
  openAtPath(path: string[]): Atom.Writable<boolean> {
    return this.#expandedState(path.join('/'));
  }

  /**
   * `TreeModel` view over the same atoms.
   *
   * `childIds` yields nothing until the node is open, so the walk never starts a per-node query for a
   * closed row, and the query is released when the node closes. `itemProps.parentOf` of a closed node
   * comes from the space-wide index, which is all the row needs to decide whether to draw a toggle.
   */
  get treeModel(): TreeModel<ObjectsTreeItem> {
    return {
      childIds: (parentId?: string) => this.#childIdsFamily(parentId ?? ROOT_ANCHOR),
      item: (id: string) => this.#itemFamily(id),
      itemProps: (path: string[]) => this.#itemPropsFamily(path.join('/')),
      itemOpen: (path: string[]) => this.openAtPath(path),
      itemCurrent: (path: string[]) => this.#currentFamily(path.at(-1) ?? ''),
    };
  }

  #currentFamily = Atom.family((id: string) => Atom.make((get) => get(this.selected) === id));

  #childIdsFamily = Atom.family((anchor: string) =>
    Atom.make((get): string[] => {
      if (anchor !== ROOT_ANCHOR && !get(this.#openIds(anchor))) {
        return [];
      }
      if (anchor !== ROOT_ANCHOR || this.#root !== null) {
        return get(this.#atoms(anchor === ROOT_ANCHOR ? null : anchor)).map((child) => child.id);
      }
      const filter = get(this.filter).trim().toLowerCase();
      const ids = get(this.ids);
      // Labels are read only while filtering, so an unfiltered list does not depend on every row's snapshot.
      return get(this.#graph).objects.filter(
        (id) =>
          (!ids || ids.has(id)) &&
          (!filter || (get(this.#itemFamily(id))?.label.toLowerCase().includes(filter) ?? false)),
      );
    }),
  );

  /** True when any path addressing this node is open; the walk is keyed by id, the rows by path. */
  #openIds = Atom.family((id: string) => Atom.make((get) => get(this.#openPathsState(id)).size > 0));
  // A set rather than a flag: the same entity appears at several paths (a child, a relation's two ends),
  // and closing one of them must not empty the others.
  #openPathsState = Atom.family((_id: string) => Atom.make<ReadonlySet<string>>(new Set<string>()));

  /** Walk-gating state, keyed by id — `Tree` addresses rows by path, but `childIds` only has the id. */
  openPaths(id: string): Atom.Writable<ReadonlySet<string>> {
    return this.#openPathsState(id);
  }

  #itemFamily = Atom.family((id: string) =>
    Atom.make((get): ObjectsTreeItem | undefined => {
      const live = get(this.#indexedFamily(id));
      const entity = live ? get(Entity.atom(live)) : get(this.#entityByIdFamily(id));
      return entity ? this.#mapEntityToTreeItems(entity, null) : undefined;
    }),
  );

  /**
   * Per-id views of the space-wide index. Each change to the result set rebuilds the index, and each
   * row atom must settle to an equal value unless its own entry changed, or the walk re-runs once per row.
   */
  #indexedFamily = Atom.family((id: string) =>
    Atom.make((get): Entity.Unknown | undefined => get(this.#graph).byId.get(id)),
  );

  #reachableFamily = Atom.family((id: string) =>
    Atom.make((get): readonly string[] => get(this.#graph).reachable.get(id) ?? []).pipe(
      Atom.withEquality(Array.makeEquivalence((a: string, b: string) => a === b)),
    ),
  );

  /** Fallback for an entity the space-wide index has not seen yet (e.g. a root outside it); read only on a miss. */
  #entityByIdFamily = Atom.family((id: string) => {
    const entities = this.#database.query(
      Query.select(Filter.id(id)).options({ deleted: 'include' }).from(this.#database),
    ).atom;
    return Atom.make((get): Entity.Snapshot | undefined => {
      const entity = get(entities)[0];
      return entity ? get(Entity.atom(entity)) : undefined;
    });
  });

  /**
   * The node as reached through `path`. `model.item(id)` cannot carry this: `type` — and so the
   * relation arrow — is computed relative to the anchor, so an id-keyed lookup reports every
   * relation as incoming.
   */
  itemAt(path: string[]): Atom.Atom<ObjectsTreeItem | undefined> {
    return this.#itemAtFamily(path.join('/'));
  }

  #itemAtFamily = Atom.family((key: string) =>
    Atom.make((get): ObjectsTreeItem | undefined => {
      const path = key.split('/');
      const id = path[path.length - 1];
      // The synthetic root is not an entity id, and `#atoms` asserts that it is one.
      const parent = path.length > 1 ? path[path.length - 2] : null;
      const anchor = parent === ROOT_ANCHOR ? null : parent;
      // A top-level row is reached through no relation, so its id-keyed item is already exact.
      if (anchor === null && this.#root === null) {
        return get(this.#itemFamily(id));
      }
      return get(this.#siblingsFamily(anchor)).get(id) ?? get(this.#itemFamily(id));
    }),
  );

  /** Keyed by id so resolving every row under an anchor is linear in its children, not quadratic. */
  #siblingsFamily = Atom.family((anchor: string | null) =>
    Atom.make((get) => new Map(get(this.#atoms(anchor)).map((item) => [item.id, item]))),
  );

  /**
   * Props are keyed by path, not id: `type` and the relation arrows are computed relative to the
   * anchor the node was reached through, so the same entity reads differently under two parents.
   * A closed node reads its children from the space-wide index, so only open nodes hold a query.
   */
  #itemPropsFamily = Atom.family((key: string) =>
    Atom.make((get): TreeItemDataProps => {
      const path = key.split('/');
      const id = path[path.length - 1];
      const item = get(this.#itemAtFamily(key));
      const children = get(this.#openIds(id))
        ? get(this.#atoms(id)).map((child) => child.id)
        : get(this.#reachableFamily(id));
      return {
        id,
        label: item?.label ?? id,
        icon: item?.icon,
        iconHue: item?.iconHue,
        headingClassName: item?.deleted ? 'line-through opacity-60' : undefined,
        ...(children.length > 0 && { parentOf: [...children] }),
      };
    }),
  );

  #makeNodeAtom(anchor: string | null): Atom.Atom<ObjectsTreeItem[]> {
    log('makeNodeAtom', { anchor });
    if (typeof anchor === 'string') {
      invariant(EntityId.isValid(anchor));

      const entities: Atom.Atom<Entity.Unknown[]> = this.#database.query(
        Query.all(
          Query.select(Filter.id(anchor)).children(),
          Query.select(Filter.id(anchor)).sourceOf(),
          Query.select(Filter.id(anchor)).targetOf(),
          Query.select(Filter.id(anchor)).source(),
          Query.select(Filter.id(anchor)).target(),
        )
          .options({
            deleted: 'include',
          })
          .from(this.#database),
      ).atom;

      return Atom.make((get) =>
        pipe(
          get(entities),
          Array.map((entity) => Entity.atom(entity).pipe(get)),
          Array.map((entity) => this.#mapEntityToTreeItems(entity, anchor)),
          Array.sortBy(itemOrder),
        ),
      );
    } else if (this.#root !== null) {
      return Entity.atom(this.#root).pipe((_) => Atom.make((get) => [this.#mapEntityToTreeItems(get(_), null)]));
    } else {
      return Atom.make((get) =>
        get(this.#graph).objects.flatMap((id) => {
          const item = get(this.#itemFamily(id));
          return item ? [item] : [];
        }),
      );
    }
  }

  #mapEntityToTreeItems(entity: Entity.Snapshot, anchor: string | null): ObjectsTreeItem {
    const { icon, hue } = Entity.getIcon(entity) ?? {
      icon: Obj.isSnapshot(entity) ? DEFAULT_OBJECT_ICON : DEFAULT_RELATION_ICON,
      hue: undefined,
    };
    return {
      id: entity.id,
      type: Relation.isSnapshot(entity)
        ? EID.getEntityId(Relation.getSourceURI(entity)) === anchor
          ? 'outgoing-relation'
          : 'incoming-relation'
        : 'object',
      deleted: Entity.isDeleted(entity),
      label:
        Entity.getLabel(entity) ??
        Entity.getTypename(entity) ??
        `${Obj.isObject(entity) ? 'Object' : 'Relation'}-${entity.id.slice(-4)}`,
      icon,
      iconHue: hue,
      role: computeRole(entity),
      entity,
    };
  }
}

/** Mirrors the per-anchor query in `#makeNodeAtom` (children, sourceOf, targetOf, source, target) over one result set. */
const buildGraphIndex = (entities: readonly Entity.Unknown[]): ObjectsGraphIndex => {
  const objects: string[] = [];
  const byId = new Map<string, Entity.Unknown>();
  const reachable = new Map<string, string[]>();
  const link = (anchor: string | undefined, id: string) => {
    if (anchor === undefined) {
      return;
    }
    const ids = reachable.get(anchor);
    if (ids) {
      ids.push(id);
    } else {
      reachable.set(anchor, [id]);
    }
  };

  for (const entity of entities) {
    byId.set(entity.id, entity);
    if (Relation.isRelation(entity)) {
      const source = EID.getEntityId(Relation.getSourceURI(entity));
      const target = EID.getEntityId(Relation.getTargetURI(entity));
      link(source, entity.id);
      link(target, entity.id);
      source && link(entity.id, source);
      target && link(entity.id, target);
    } else if (Obj.isObject(entity)) {
      objects.push(entity.id);
      link(Obj.getParent(entity)?.id, entity.id);
    }
  }

  return { objects, byId, reachable };
};

/** Synthetic anchor for the top level; `childIds` is ungated here so roots always load. */
const ROOT_ANCHOR = 'objects';

const DEFAULT_OBJECT_ICON = 'ph--cube--regular';
const DEFAULT_RELATION_ICON = 'ph--link--regular';

const itemOrder: Order.Order<ObjectsTreeItem> = Order.mapInput(
  Order.Number,
  Match.type<ObjectsTreeItem>().pipe(
    Match.when({ type: 'object' }, () => 0),
    Match.when({ type: 'outgoing-relation' }, () => 1),
    Match.when({ type: 'incoming-relation' }, () => 2),
    Match.exhaustive,
  ),
);

const computeRole = (entity: Entity.Snapshot): string | undefined => {
  if (!Obj.isSnapshot(entity)) {
    log.info('not an object');
    return undefined;
  }
  const parent = Obj.getParent(entity);
  if (parent === undefined) {
    return undefined;
  }

  for (const key of Record.keys(parent)) {
    if (Ref.isRef(parent[key]) && parent[key].target?.id === entity.id) {
      return `$.${key}`;
    }
  }

  return undefined;
};
