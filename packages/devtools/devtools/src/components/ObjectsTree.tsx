//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Match from 'effect/Match';
import * as Order from 'effect/Order';
import * as Record from 'effect/Record';
import * as Schema from 'effect/Schema';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import React from 'react';

import { raise } from '@dxos/debug';
import { type Database, Entity, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { DropdownMenu, Icon, IconButton } from '@dxos/react-ui';
import { Treegrid, TREEGRID_PARENT_OF_SEPARATOR, TreeItemToggle, paddingIndentation } from '@dxos/react-ui-list';
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

  const rootNodes = useAtomValue(model.rootNodes);
  const contextValue = useMemo(() => ({ model, onOpen, canOpen }), [model, onOpen, canOpen]);

  return (
    <ObjectsTreeContext.Provider value={contextValue}>
      <Treegrid.Root
        gridTemplateColumns='[tree-row-start] 1fr min-content [tree-row-end]'
        classNames='grid-cols-1 gap-0'
      >
        {rootNodes.map((node) => (
          <ObjectsTreeRow key={node.id} node={node} level={1} parent={null} />
        ))}
      </Treegrid.Root>
    </ObjectsTreeContext.Provider>
  );
};

const ObjectsTreeRow = ({
  node,
  level,
  parent,
}: {
  node: ObjectsTreeItem;
  level: number;
  parent: ObjectsTreeItem | null;
}) => {
  const { model, onOpen, canOpen } = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const expanded = useAtomValue(model.expanded(node.id, level));
  const setExpanded = useAtomSet(model.expanded(node.id, level));
  const children = useAtomValue(model.getChildren(node.id));
  const hasChildren = children.length > 0;
  const parentOf = hasChildren ? children.map((child) => child.id).join(TREEGRID_PARENT_OF_SEPARATOR) : undefined;

  const styles = node.iconHue ? getStyles(node.iconHue) : undefined;

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
  }, [node.entity]);
  const handleDelete = useCallback(async () => {
    const obj = await model.database.query(Query.select(Filter.id(node.id)).options({ deleted: 'include' })).first();
    model.database.remove(obj);
    await model.database.flush({ indexes: true });
  }, [node.entity, model.database]);
  const handleRestore = useCallback(async () => {
    const obj = await model.database.query(Query.select(Filter.id(node.id)).options({ deleted: 'include' })).first();
    model.database.add(obj);
    await model.database.flush({ indexes: true });
  }, [node.entity, model.database]);

  return (
    <>
      <Treegrid.Row
        id={node.id}
        open={expanded}
        onOpenChange={setExpanded}
        {...(parentOf && { parentOf })}
        classNames='grid grid-cols-subgrid col-[tree-row] cursor-pointer hover:bg-hover-surface'
        onClick={() => model.onSelect(node.entity)}
      >
        <div className='indent relative grid grid-cols-subgrid col-[tree-row]' style={paddingIndentation(level)}>
          <Treegrid.Cell indent classNames='flex items-center gap-1 min-w-0'>
            <TreeItemToggle isBranch={hasChildren} open={expanded} onClick={() => setExpanded((prev) => !prev)} />
            {node.type === 'outgoing-relation' && (
              <Icon icon='ph--arrow-right--regular' classNames='shrink-0 w-4 h-4 opacity-70' />
            )}
            {node.type === 'incoming-relation' && (
              <Icon icon='ph--arrow-left--regular' classNames='shrink-0 w-4 h-4 opacity-70' />
            )}
            <Icon icon={node.icon} classNames={['shrink-0 w-4 h-4', styles?.text]} />
            <span className={node.deleted ? 'line-through opacity-60' : 'truncate'}>{node.label}</span>
            {node.role && <span className='text-subdued text-xs'>{node.role}</span>}
          </Treegrid.Cell>
          <Treegrid.Cell classNames='contents'>
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
          </Treegrid.Cell>
        </div>
      </Treegrid.Row>
      {expanded &&
        children
          .filter((child) => child.id !== parent?.id)
          .map((child, index) => <ObjectsTreeRow key={child.id} node={child} level={level + 1} parent={node} />)}
    </>
  );
};
ObjectsTreeRow.displayName = 'ObjectsTreeRow';

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

const ExpandedKeySchema = Schema.TemplateLiteralParser(
  // id
  Schema.String,
  '-',
  // level
  Schema.Number,
);

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

const DEFAULT_OBJECT_ICON = 'ph--cube--regular';
const DEFAULT_RELATION_ICON = 'ph--link--regular';

const itemOrder: Order.Order<ObjectsTreeItem> = Order.mapInput(
  Order.number,
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
