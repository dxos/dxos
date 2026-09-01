//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Array from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Match from 'effect/Match';
import * as Order from 'effect/Order';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import React from 'react';

import { raise } from '@dxos/debug';
import { type Database, Entity, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { DropdownMenu, Icon, IconButton, ScrollArea } from '@dxos/react-ui';
import {
  type ColumnRenderer,
  type IconRenderer,
  Tree,
  type TreeItemDataProps,
  type TreeModel,
} from '@dxos/react-ui-list';
import { getStyles, hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

export interface ObjectsTreeProps {
  db: Database.Database;
  root?: Entity.Unknown;
  onSelect?: (entity: Entity.Snapshot) => void;
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
}

export const ObjectsTree = ({ db, root, onSelect, onOpen, canOpen }: ObjectsTreeProps) => {
  const [model, setModel] = useState(() => new ObjectsTreeModel(db, root ?? null, onSelect ?? (() => {})));
  useEffect(() => {
    setModel((prev) =>
      prev.database === db && prev.root === (root ?? null)
        ? prev
        : new ObjectsTreeModel(db, root ?? null, onSelect ?? (() => {})),
    );
  }, [db, root]);

  const registry = useContext(RegistryContext);
  const contextValue = useMemo(() => ({ model, onOpen, canOpen }), [model, onOpen, canOpen]);

  // The walk is gated by id while rows are addressed by path, so a toggle writes both.
  const handleOpenChange = useCallback(
    ({ item, path, open }: { item: ObjectsTreeItem; path: string[]; open: boolean }) => {
      registry.set(model.openAtPath(path), open);
      registry.set(model.markOpen(item.id), open);
    },
    [model, registry],
  );

  const handleSelect = useCallback(({ item }: { item: ObjectsTreeItem }) => model.onSelect(item.entity), [model]);

  return (
    <ObjectsTreeContext.Provider value={contextValue}>
      <ScrollArea.Root classNames='dx-expander' thin>
        <ScrollArea.Viewport>
          <Tree<ObjectsTreeItem>
            id={ROOT_ANCHOR}
            model={model.treeModel}
            // `minmax(0, 1fr)`, not `1fr`: a bare `1fr` is `minmax(auto, 1fr)`, whose automatic
            // minimum is the content's min-content width, so a long relation typename on a deep row
            // would widen the track and push the trailing columns instead of truncating.
            //
            // The role sits in the SAME track as the actions rather than its own: a separate
            // `min-content` column is sized from the widest role across the whole subgrid, so
            // expanding a node whose child carries a role widened that track and visibly shifted
            // every row's action button.
            gridTemplateColumns='[tree-row-start] minmax(0, 1fr) min-content [tree-row-end]'
            classNames='w-full min-w-0'
            renderIcon={ObjectsTreeIcon}
            renderColumns={ObjectsTreeColumns}
            onOpenChange={handleOpenChange}
            onSelect={handleSelect}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </ObjectsTreeContext.Provider>
  );
};

/** Relation direction arrow plus the entity's own glyph, which a static icon name cannot express. */
const ObjectsTreeIcon: IconRenderer<ObjectsTreeItem> = ({ item, path }) => {
  const { model } = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const scoped = useAtomValue(model.itemAt(path)) ?? item;
  const styles = scoped.iconHue ? getStyles(scoped.iconHue) : undefined;
  return (
    <>
      {scoped.type === 'outgoing-relation' && (
        <Icon icon='ph--arrow-right--regular' classNames='shrink-0 w-4 h-4 opacity-70' />
      )}
      {scoped.type === 'incoming-relation' && (
        <Icon icon='ph--arrow-left--regular' classNames='shrink-0 w-4 h-4 opacity-70' />
      )}
      <Icon icon={scoped.icon} classNames={['shrink-0 w-4 h-4', styles?.text]} />
    </>
  );
};

/** Trailing columns: the reference key this entity is held under, and the per-row action menu. */
const ObjectsTreeColumns: ColumnRenderer<ObjectsTreeItem> = ({ item, path }) => {
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
      {node.role && <span className='text-subdued text-xs'>{node.role}</span>}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <IconButton
            classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
            variant='ghost'
            icon='ph--dots-three-vertical--regular'
            iconOnly
            label='Actions'
            data-testid='objects-tree.row.actions'
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {showOpen && (
            <DropdownMenu.Item onClick={handleOpen}>
              <Icon icon='ph--arrow-square-out--regular' />
              Open
            </DropdownMenu.Item>
          )}
          {!node.deleted && (
            <DropdownMenu.Item onClick={handleDelete}>
              <Icon icon='ph--trash--regular' />
              Delete
            </DropdownMenu.Item>
          )}
          {node.deleted && (
            <DropdownMenu.Item onClick={handleRestore}>
              <Icon icon='ph--arrow-counter-clockwise--regular' />
              Restore
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator />
          <DropdownMenu.Item onClick={handleCopyDXN}>
            <Icon icon='ph--copy--regular' />
            Copy DXN
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={handleCopyJSON}>
            <Icon icon='ph--brackets-curly--regular' />
            Copy JSON
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={handlePrintToConsole}>
            <Icon icon='ph--terminal-window--regular' />
            Print to console
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
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

class ObjectsTreeModel {
  #onSelect: (entity: Entity.Snapshot) => void;
  #database: Database.Database;
  #root: Entity.Unknown | null;
  #atoms = Atom.family((anchor: string | null) => this.#makeNodeAtom(anchor));
  #expandedState = Atom.family((_key: string) => Atom.make(false));

  constructor(database: Database.Database, root: Entity.Unknown | null, onSelect: (entity: Entity.Snapshot) => void) {
    this.#database = database;
    this.#root = root;
    this.#onSelect = onSelect;
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
   * `childIds` yields nothing until the node is open, so the tree's walk — which recurses into every
   * branch regardless of `open` — stops one level ahead rather than querying the whole reachable
   * object graph. `itemProps.parentOf` still reads that one level, which is what the row needed
   * anyway to decide whether to draw a toggle.
   */
  get treeModel(): TreeModel<ObjectsTreeItem> {
    return {
      childIds: (parentId?: string) => this.#childIdsFamily(parentId ?? ROOT_ANCHOR),
      item: (id: string) => this.#itemFamily(id),
      itemProps: (path: string[]) => this.#itemPropsFamily(path.join('/')),
      itemOpen: (path: string[]) => this.openAtPath(path),
      itemCurrent: () => NEVER_CURRENT,
    };
  }

  #childIdsFamily = Atom.family((anchor: string) =>
    Atom.make((get): string[] => {
      if (anchor !== ROOT_ANCHOR && !get(this.#openIds(anchor))) {
        return [];
      }
      const children = get(this.#atoms(anchor === ROOT_ANCHOR ? null : anchor));
      return children.map((child) => child.id);
    }),
  );

  /** True when any path addressing this node is open; the walk is keyed by id, the rows by path. */
  #openIds = Atom.family((id: string) => Atom.make((get) => get(this.#openIdState(id))));
  #openIdState = Atom.family((_id: string) => Atom.make(false));

  /** Walk-gating state, keyed by id — `Tree` addresses rows by path, but `childIds` only has the id. */
  markOpen(id: string): Atom.Writable<boolean> {
    return this.#openIdState(id);
  }

  #itemFamily = Atom.family((id: string) => {
    const entities = this.#database.query(
      Query.select(Filter.id(id)).options({ deleted: 'include' }).from(this.#database),
    ).atom;
    return Atom.make((get): ObjectsTreeItem | undefined => {
      const entity = get(entities)[0];
      return entity ? this.#mapEntityToTreeItems(get(Entity.atom(entity)), null) : undefined;
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
      return get(this.#atoms(anchor)).find((sibling) => sibling.id === id) ?? get(this.#itemFamily(id));
    }),
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
      const children = get(this.#atoms(id));
      return {
        id,
        label: item?.label ?? id,
        icon: item?.icon,
        iconHue: item?.iconHue,
        headingClassName: item?.deleted ? 'line-through opacity-60' : undefined,
        ...(children.length > 0 && { parentOf: children.map((child) => child.id) }),
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
      const entities: Atom.Atom<Entity.Unknown[]> = this.#database.query(
        Query.select(Filter.everything()).options({ deleted: 'include' }).from(this.#database),
      ).atom;

      return Atom.make((get) =>
        pipe(
          get(entities),
          Array.filter(Obj.isObject),
          Array.map((entity) => Obj.atom(entity).pipe(get)),
          Array.map((entity) => this.#mapEntityToTreeItems(entity, null)),
          Array.sortBy(itemOrder),
        ),
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

/** Synthetic anchor for the top level; `childIds` is ungated here so roots always load. */
const ROOT_ANCHOR = 'objects';

/** Selection is reported through `onSelect`, not held in the model. */
const NEVER_CURRENT = Atom.make(false);

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
