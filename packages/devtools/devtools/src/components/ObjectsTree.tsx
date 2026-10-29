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
import type * as Registry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';

import { raise } from '@dxos/debug';
import { type Database, Entity, Filter, Obj, Query, Relation } from '@dxos/echo';
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
 * reachable from it. Queries follow what is on screen (see `ObjectsTreeModel`), not the size of the
 * space. Renders through `Tree`, so disclosure, roving focus and the APG keymap are the machine's.
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
  useEffect(() => () => model.dispose(), [model]);
  useEffect(() => registry.set(model.filter, filter ?? ''), [registry, model, filter]);
  useEffect(() => registry.set(model.ids, ids), [registry, model, ids]);
  useEffect(() => registry.set(model.selected, selected), [registry, model, selected]);
  const contextValue = useMemo(() => ({ model, onOpen, canOpen }), [model, onOpen, canOpen]);

  const handleOpenChange = useCallback(
    ({ path, open }: { path: string[]; open: boolean }) => model.setOpen(registry, path, open),
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
        // column instead of truncating.
        columns='var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content'
        onOpenChange={handleOpenChange}
        onSelect={handleSelect}
      >
        <Tree.Content>{renderRow}</Tree.Content>
      </Tree.Root>
    </ObjectsTreeContext.Provider>
  );
};

/** A row: the entity's glyph (a relation's direction), its label, then a relation's glyph and the action menu. */
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

/**
 * An object's glyph, or a relation's direction relative to the row it hangs off: the slot is one block, so a relation's
 * own glyph goes to the end of the row (`ObjectsTreeColumns`).
 */
const ObjectsTreeIcon = ({ item, path }: ObjectsTreeRowProps) => {
  const { model } = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const scoped = useAtomValue(model.itemAt(path)) ?? item;
  const styles = scoped.iconHue ? getStyles(scoped.iconHue) : undefined;
  switch (scoped.type) {
    case 'outgoing-relation':
      return <Icon.Icon icon='ph--arrow-right--regular' classNames='w-4 h-4 opacity-70' />;
    case 'incoming-relation':
      return <Icon.Icon icon='ph--arrow-left--regular' classNames='w-4 h-4 opacity-70' />;
    default:
      return <Icon.Icon icon={scoped.icon} classNames={['w-4 h-4', styles?.text]} />;
  }
};

/** Trailing column: a relation's own glyph, and the per-row action menu. */
const ObjectsTreeColumns = ({ item, path }: ObjectsTreeRowProps) => {
  const { model, onOpen, canOpen } = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const node = useAtomValue(model.itemAt(path)) ?? item;
  const visibleRef = useVisibleRow(model, item.id);

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
    <div ref={visibleRef} className='flex shrink-0 items-center gap-1'>
      {node.type !== 'object' && (
        <Icon.Icon icon={node.icon} classNames={['w-4 h-4', node.iconHue ? getStyles(node.iconHue).text : undefined]} />
      )}
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

/** Reports the row to the model while it intersects the viewport, which is what bounds the presence query and paging. */
const useVisibleRow = (model: ObjectsTreeModel, id: string) => {
  const registry = useContext(RegistryContext);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    let hide: (() => void) | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        hide ??= model.show(registry, id);
      } else {
        hide?.();
        hide = undefined;
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      hide?.();
    };
  }, [model, registry, id]);
  return ref;
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
  entity: Entity.Snapshot;
};

const ExpandedKeySchema = Schema.TemplateLiteralParser([
  // id
  Schema.String,
  '-',
  // level
  Schema.Number,
]);

/** Top-level rows per page; scrolling near the end of what is listed adds the next page. */
const PAGE_SIZE = 100;
/** How close to the end of the listed rows a visible row must be to add the next page. */
const PAGE_MARGIN = 20;
/** Rows enter and leave view many times per scroll; the presence query is rebuilt once they settle. */
const VISIBLE_SETTLE_MS = 100;

/** Top-level entities in list order; `complete` is false while more exist than are listed. */
type ObjectsTreeList = { entities: readonly Entity.Unknown[]; complete: boolean };

/**
 * Queries follow what is on screen: one space-wide list query whose rows are paged in as the user
 * scrolls, one query for whether the rows in view have children, and one relation query per open
 * node. Per-row work (snapshots, the walk) is bounded by the pages scrolled through.
 *
 * @internal Exported for tests.
 */
export class ObjectsTreeModel {
  #onSelect: (entity: Entity.Snapshot) => void;
  #database: Database.Database;
  #root: Entity.Unknown | null;
  #atoms = Atom.family((anchor: string) => this.#makeNodeAtom(anchor));
  #expandedState = Atom.family((_key: string) => Atom.make(false));
  /** Top-level label filter, set by the component's `filter` prop. */
  readonly filter = Atom.make('');
  /** Top-level id filter, set by the component's `ids` prop. */
  readonly ids = Atom.make<ReadonlySet<string> | undefined>(undefined);
  /** Highlighted entity, set by the component's `selected` prop. */
  readonly selected = Atom.make<string | undefined>(undefined);
  /** Number of top-level rows listed. */
  #limit = Atom.make(PAGE_SIZE);
  /** Anchors with at least one open path; only these hold a relation query. */
  #openAnchors = Atom.make<ReadonlySet<string>>(new Set<string>());
  /** Rows in view, published once they settle; the presence query covers exactly these. */
  #visible = Atom.make<ReadonlySet<string>>(new Set<string>());
  /** Rows in view by id, counted because one entity can be on screen at several paths. */
  #shown = new Map<string, number>();
  #settleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(database: Database.Database, root: Entity.Unknown | null, onSelect: (entity: Entity.Snapshot) => void) {
    this.#database = database;
    this.#root = root;
    this.#onSelect = onSelect;
    this.#spaceQuery = this.#queryAtom(Query.select(Filter.everything()).options({ deleted: 'include' }));
  }

  get database(): Database.Database {
    return this.#database;
  }

  get root(): Entity.Unknown | null {
    return this.#root;
  }

  get rootNodes(): Atom.Atom<ObjectsTreeItem[]> {
    return this.#rootNodes;
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

  /** Opens or closes the row at `path`; the walk is gated by id while rows are addressed by path, so this writes both. */
  setOpen(registry: Registry.AtomRegistry, path: string[], open: boolean): void {
    const id = path[path.length - 1];
    registry.set(this.openAtPath(path), open);
    const paths = new Set(registry.get(this.#openPathsState(id)));
    if (open) {
      paths.add(path.join('/'));
    } else {
      paths.delete(path.join('/'));
    }
    registry.set(this.#openPathsState(id), paths);
    const anchors = new Set(registry.get(this.#openAnchors));
    if (paths.size > 0) {
      anchors.add(id);
    } else {
      anchors.delete(id);
    }
    registry.set(this.#openAnchors, anchors);
  }

  /**
   * Marks a row as in view until the returned callback runs. Visibility, not mounting, decides what
   * is queried: a row rendered off screen asks for nothing.
   */
  show(registry: Registry.AtomRegistry, id: string): () => void {
    this.#shown.set(id, (this.#shown.get(id) ?? 0) + 1);
    this.#scheduleSettle(registry);
    let shown = true;
    return () => {
      if (!shown) {
        return;
      }
      shown = false;
      const count = (this.#shown.get(id) ?? 1) - 1;
      if (count > 0) {
        this.#shown.set(id, count);
      } else {
        this.#shown.delete(id);
      }
      this.#scheduleSettle(registry);
    };
  }

  /** Drops a pending settle, which would otherwise write to a registry the tree no longer uses. */
  dispose(): void {
    clearTimeout(this.#settleTimer);
    this.#settleTimer = undefined;
  }

  #scheduleSettle(registry: Registry.AtomRegistry): void {
    clearTimeout(this.#settleTimer);
    this.#settleTimer = setTimeout(() => this.#settle(registry), VISIBLE_SETTLE_MS);
  }

  #settle(registry: Registry.AtomRegistry): void {
    const visible = new Set(this.#shown.keys());
    registry.set(this.#visible, visible);
    if (registry.get(this.#list).complete) {
      return;
    }
    const top = registry.get(this.#childIdsFamily(ROOT_ANCHOR));
    if (top.slice(-PAGE_MARGIN).some((id) => visible.has(id))) {
      registry.set(this.#limit, registry.get(this.#limit) + PAGE_SIZE);
    }
  }

  /**
   * `TreeModel` view over the same atoms.
   *
   * `childIds` yields nothing until the node is open, so the walk never starts a relation query for a
   * closed row, and the query is released when the node closes. `itemProps.parentOf` of a closed row
   * comes from the presence query over the rows in view; an off-screen row draws no toggle and needs none.
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
      if (anchor !== ROOT_ANCHOR) {
        return get(this.#openIds(anchor)) ? get(this.#atoms(anchor)).map((child) => child.id) : [];
      }
      const filter = get(this.filter).trim().toLowerCase();
      const ids = get(this.#list).entities.map((entity) => entity.id);
      // Labels are read only while filtering, so an unfiltered list does not depend on every row's snapshot.
      return filter
        ? ids.filter((id) => get(this.#itemFamily(id))?.label.toLowerCase().includes(filter) ?? false)
        : ids;
    }),
  );

  /** True when any path addressing this node is open; the walk is keyed by id, the rows by path. */
  #openIds = Atom.family((id: string) => Atom.make((get) => get(this.#openPathsState(id)).size > 0));
  // A set rather than a flag: the same entity appears at several paths (a child, a relation's two ends),
  // and closing one of them must not empty the others.
  #openPathsState = Atom.family((_id: string) => Atom.make<ReadonlySet<string>>(new Set<string>()));

  /**
   * The top level, paged as the user scrolls. A text filter has to see every label, so only then is
   * the list unpaged.
   */
  #list = Atom.make((get): ObjectsTreeList => {
    if (this.#root !== null) {
      return { entities: [this.#root], complete: true };
    }
    const filtered = get(this.filter).trim().length > 0;
    const limit = get(this.#limit);
    const ids = get(this.ids);
    // The `ids` set is queried whole and paged like the space: paging the ids themselves stalls when a
    // page resolves to relations or missing entities, since no row of it mounts to ask for the next.
    const entities =
      ids === undefined
        ? get(this.#spaceQuery)
        : get(this.#idsQueryFamily([...ids].filter((id) => EntityId.isValid(id)).join(',')));
    const objects = entities.filter((entity) => Obj.isObject(entity));
    return {
      entities: filtered ? objects : objects.slice(0, limit),
      complete: filtered || objects.length <= limit,
    };
  });

  /**
   * Paged here rather than with `.limit()`: a windowed query is answered only by the index, and a
   * live one can sit empty, while this one is served from the working set.
   */
  #spaceQuery: Atom.Atom<Entity.Unknown[]>;

  #idsQueryFamily = Atom.family((key: string): Atom.Atom<Entity.Unknown[]> => {
    const ids = validIds(key);
    return ids.length > 0
      ? this.#queryAtom(Query.select(Filter.id(...ids)).options({ deleted: 'include' }))
      : Atom.make<Entity.Unknown[]>([]);
  });

  #queryAtom(query: Query.Any): Atom.Atom<Entity.Unknown[]> {
    return this.#database.query(query.from(this.#database)).atom;
  }

  /** Every entity a row can show: the top level plus the results of each open node's query. */
  #entities = Atom.make((get): ReadonlyMap<string, Entity.Unknown> => {
    const byId = new Map(get(this.#list).entities.map((entity) => [entity.id, entity]));
    for (const anchor of get(this.#openAnchors)) {
      for (const entity of get(this.#anchorQueryFamily(anchor))) {
        byId.set(entity.id, entity);
      }
    }
    return byId;
  });

  /**
   * Per-id view of `#entities`. Any page or open node rebuilds the map, and each row must settle to an
   * equal value unless its own entry changed, or the walk re-runs once per row.
   */
  #entityFamily = Atom.family((id: string) =>
    Atom.make((get): Entity.Unknown | undefined => get(this.#entities).get(id)),
  );

  #itemFamily = Atom.family((id: string) =>
    Atom.make((get): ObjectsTreeItem | undefined => {
      const entity = get(this.#entityFamily(id));
      return entity ? this.#mapEntityToTreeItems(get(Entity.atom(entity)), null) : undefined;
    }),
  );

  #rootNodes = Atom.make((get): ObjectsTreeItem[] =>
    get(this.#list).entities.flatMap((entity) => {
      const item = get(this.#itemFamily(entity.id));
      return item ? [item] : [];
    }),
  );

  /** One query for the rows in view: their child objects and the relations they are an end of. */
  #presence = Atom.make((get): ReadonlyMap<string, readonly string[]> => {
    const anchors = [...get(this.#visible)].filter((id) => EntityId.isValid(id)).sort();
    return anchors.length > 0 ? buildPresence(anchors, get(this.#presenceQueryFamily(anchors.join(',')))) : new Map();
  });

  #presenceQueryFamily = Atom.family((key: string) => {
    const anchors = validIds(key);
    return this.#queryAtom(
      Query.all(
        Query.select(Filter.id(...anchors)).children(),
        Query.select(Filter.id(...anchors)).sourceOf(),
        Query.select(Filter.id(...anchors)).targetOf(),
      ).options({ deleted: 'include' }),
    );
  });

  /** Per-id view of `#presence`, compared by value so a scroll does not re-run the walk for rows whose answer held. */
  #presenceFamily = Atom.family((id: string) =>
    Atom.make((get): readonly string[] => get(this.#presence).get(id) ?? []).pipe(
      Atom.withEquality(Array.makeEquivalence((a: string, b: string) => a === b)),
    ),
  );

  /**
   * The node as reached through `path`. `model.item(id)` cannot carry this: `type` - and so the
   * relation arrow - is computed relative to the anchor, so an id-keyed lookup reports every
   * relation as incoming.
   */
  itemAt(path: string[]): Atom.Atom<ObjectsTreeItem | undefined> {
    return this.#itemAtFamily(path.join('/'));
  }

  #itemAtFamily = Atom.family((key: string) =>
    Atom.make((get): ObjectsTreeItem | undefined => {
      const path = key.split('/');
      const id = path[path.length - 1];
      const parent = path.length > 1 ? path[path.length - 2] : ROOT_ANCHOR;
      // A top-level row is reached through no relation, so its id-keyed item is already exact.
      if (parent === ROOT_ANCHOR) {
        return get(this.#itemFamily(id));
      }
      return get(this.#siblingsFamily(parent)).get(id) ?? get(this.#itemFamily(id));
    }),
  );

  /** Keyed by id so resolving every row under an anchor is linear in its children, not quadratic. */
  #siblingsFamily = Atom.family((anchor: string) =>
    Atom.make((get) => new Map(get(this.#atoms(anchor)).map((item) => [item.id, item]))),
  );

  /**
   * Props are keyed by path, not id: `type` and the relation arrows are computed relative to the
   * anchor the node was reached through, so the same entity reads differently under two parents.
   */
  #itemPropsFamily = Atom.family((key: string) =>
    Atom.make((get): TreeItemDataProps => {
      const path = key.split('/');
      const id = path[path.length - 1];
      const item = get(this.#itemAtFamily(key));
      const children = get(this.#openIds(id))
        ? get(this.#atoms(id)).map((child) => child.id)
        : item && Relation.isSnapshot(item.entity)
          ? relationEnds(item.entity)
          : get(this.#presenceFamily(id));
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

  #anchorQueryFamily = Atom.family((anchor: string) => {
    log('anchorQuery', { anchor });
    invariant(EntityId.isValid(anchor));
    return this.#queryAtom(
      Query.all(
        Query.select(Filter.id(anchor)).children(),
        Query.select(Filter.id(anchor)).sourceOf(),
        Query.select(Filter.id(anchor)).targetOf(),
        Query.select(Filter.id(anchor)).source(),
        Query.select(Filter.id(anchor)).target(),
      ).options({ deleted: 'include' }),
    );
  });

  #makeNodeAtom(anchor: string): Atom.Atom<ObjectsTreeItem[]> {
    const entities = this.#anchorQueryFamily(anchor);
    return Atom.make((get) =>
      pipe(
        get(entities),
        Array.map((entity) => Entity.atom(entity).pipe(get)),
        Array.map((entity) => this.#mapEntityToTreeItems(entity, anchor)),
        Array.sortBy(itemOrder),
      ),
    );
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
      entity,
    };
  }
}

/** Ids from a family key; the key is built from validated ids, so this only narrows their type. */
const validIds = (key: string): EntityId[] => key.split(',').filter((id) => EntityId.isValid(id));

/** A relation's two ends, which it always has, so its row draws a toggle without a query. */
const relationEnds = (relation: Relation.Snapshot): string[] =>
  [EID.getEntityId(Relation.getSourceURI(relation)), EID.getEntityId(Relation.getTargetURI(relation))].filter(
    (id) => id !== undefined,
  );

/** Groups the presence query's results by the visible anchor each one hangs off. */
const buildPresence = (
  anchors: readonly string[],
  entities: readonly Entity.Unknown[],
): ReadonlyMap<string, readonly string[]> => {
  const visible = new Set(anchors);
  const presence = new Map<string, string[]>();
  const link = (anchor: string | undefined, id: string) => {
    if (anchor === undefined || !visible.has(anchor)) {
      return;
    }
    const ids = presence.get(anchor);
    if (ids) {
      ids.push(id);
    } else {
      presence.set(anchor, [id]);
    }
  };

  for (const entity of entities) {
    if (Relation.isRelation(entity)) {
      link(EID.getEntityId(Relation.getSourceURI(entity)), entity.id);
      link(EID.getEntityId(Relation.getTargetURI(entity)), entity.id);
    } else if (Obj.isObject(entity)) {
      link(Obj.getParent(entity)?.id, entity.id);
    }
  }

  return presence;
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
