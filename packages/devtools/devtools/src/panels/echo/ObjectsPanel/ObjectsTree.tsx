//
// Copyright 2025 DXOS.org
//

import { Filter, Query, type Database, Entity, Relation, Obj } from '@dxos/echo';
import { createContext, useContext, useEffect, useState } from 'react';
import { Atom } from '@effect-atom/atom';
import { useAtomValue, useAtomSet } from '@effect-atom/atom-react';
import { raise } from '@dxos/debug';
import { ObjectId } from '@dxos/keys';
import { invariant } from '@dxos/invariant';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Icon, Treegrid, TreeItem } from '@dxos/react-ui';
import { Array, Match, pipe } from 'effect';
import React from 'react';
import { paddingIndentation, TreeItemToggle } from '@dxos/react-ui-list';
import { dbg } from '@dxos/log';

export interface ObjectsTreeProps {
  db: Database.Database;
  root?: Entity.Unknown;
}

export const ObjectsTree = ({ db, root }: ObjectsTreeProps) => {
  const [model, setModel] = useState(() => new ObjectsTreeModel(db, root ?? null));
  useEffect(() => {
    setModel((prev) =>
      prev.database === db && prev.root === (root ?? null) ? prev : new ObjectsTreeModel(db, root ?? null),
    );
  }, [db, root]);

  const rootNodes = useAtomValue(model.rootNodes);

  dbg(rootNodes);

  return (
    <ObjectsTreeContext.Provider value={model}>
      <Treegrid.Root
        gridTemplateColumns='[tree-row-start] 1fr min-content [tree-row-end]'
        classNames='grid-cols-1 gap-0'
      >
        {rootNodes.map((node) => (
          <ObjectsTreeRow key={node.id} node={node} level={0} />
        ))}
      </Treegrid.Root>
    </ObjectsTreeContext.Provider>
  );
};

const ObjectsTreeRow = ({ node, level }: { node: ObjectsTreeItem; level: number }) => {
  const model = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const expanded = useAtomValue(model.expanded(node.id));
  const setExpanded = useAtomSet(model.expanded(node.id));
  const children = useAtomValue(model.getChildren(node.id));
  const hasChildren = children.length > 0;
  const parentOf = hasChildren ? children.map((child) => child.id).join(Treegrid.PARENT_OF_SEPARATOR) : undefined;

  return (
    <>
      <Treegrid.Row
        id={node.id}
        open={expanded}
        onOpenChange={setExpanded}
        {...(parentOf && { parentOf })}
        classNames='grid grid-cols-subgrid col-[tree-row]'
      >
        <div
          role='none'
          className='indent relative grid grid-cols-subgrid col-[tree-row]'
          style={paddingIndentation(level)}
        >
          <Treegrid.Cell indent classNames='flex items-center gap-1 min-w-0'>
            <TreeItemToggle isBranch={hasChildren} open={expanded} onClick={() => setExpanded((prev) => !prev)} />
            <Icon icon={node.icon} classNames='shrink-0 w-4 h-4 opacity-70' />
            <span className={node.deleted ? 'line-through opacity-60' : 'truncate'}>{node.label}</span>
          </Treegrid.Cell>
        </div>
      </Treegrid.Row>
      {expanded && children.map((child, index) => <ObjectsTreeRow key={child.id} node={child} level={level + 1} />)}
    </>
  );
};

const ObjectsTreeContext = createContext<ObjectsTreeModel | null>(null);

export type ObjectsTreeItem = {
  id: string;
  type: 'object' | 'outgoing-relation' | 'incoming-relation';
  deleted: boolean;
  label: string;
  icon: string;
  iconHue: string;
};

class ObjectsTreeModel {
  #database: Database.Database;
  #root: Entity.Unknown | null;
  #atoms = Atom.family((anchor: string | null) => this.#makeNodeAtom(anchor));
  #expandedState = Atom.family((id: string) => Atom.make(false));

  constructor(database: Database.Database, root: Entity.Unknown | null) {
    this.#database = database;
    this.#root = root;
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

  getChildren(id: string): Atom.Atom<ObjectsTreeItem[]> {
    return this.#atoms(id);
  }

  expanded(id: string): Atom.Writable<boolean> {
    return this.#expandedState(id);
  }

  #makeNodeAtom(anchor: string | null): Atom.Atom<ObjectsTreeItem[]> {
    if (anchor === null && this.#root !== null) {
      anchor = this.#root.id;
    }

    if (typeof anchor === 'string') {
      invariant(ObjectId.isValid(anchor));

      const entities: Atom.Atom<Entity.Unknown[]> = AtomQuery.fromQuery(
        this.#database.query(
          Query.all(
            Query.select(Filter.id(anchor)).children(),
            Query.select(Filter.id(anchor)).sourceOf(),
            Query.select(Filter.id(anchor)).targetOf(),
          ),
        ),
      );

      return Atom.make((get) =>
        pipe(
          get(entities),
          Array.map((entity) => AtomObj.make(entity).pipe(get)),
          Array.map((entity) => this.#mapEntityToTreeItems(entity, anchor)),
        ),
      );
    } else {
      const entities: Atom.Atom<Entity.Unknown[]> = AtomQuery.fromQuery(
        this.#database.query(Query.select(Filter.everything())),
      );

      return Atom.make((get) =>
        pipe(
          get(entities),
          Array.filter(Obj.isObject),
          Array.map((entity) => AtomObj.make(entity).pipe(get)),
          Array.map((entity) => this.#mapEntityToTreeItems(entity, null)),
        ),
      );
    }
  }

  #mapEntityToTreeItems(entity: Entity.Snapshot, anchor: string | null): ObjectsTreeItem {
    dbg((entity as any)[Relation.Source]);
    return {
      id: entity.id,
      type:
        // TODO(dmaretskyi): ECHO APIs around snapshots are bad.
        entity[Entity.SnapshotKindId] === 'object'
          ? 'object'
          : (entity as any)[Relation.Source].id === anchor
            ? 'outgoing-relation'
            : 'incoming-relation',
      deleted: Entity.isDeleted(entity),
      label:
        Entity.getLabel(entity) ??
        Entity.getTypename(entity) ??
        `${Obj.isObject(entity) ? 'Object' : 'Relation'}-${entity.id.slice(-4)}`,
      icon: Obj.isObject(entity) ? 'ph--cube--regular' : 'ph--arrow-right--regular',
      iconHue: 'blue',
    };
  }
}
