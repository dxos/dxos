import { Filter, Query, type Database, Entity, Relation, Obj } from '@dxos/echo';
import { createContext, useContext, useEffect, useState, type Context } from 'react';
import { Atom } from '@effect-atom/atom';
import { useAtomValue, useAtomSet } from '@effect-atom/atom-react';
import { raise } from '@dxos/debug';
import { ObjectId } from '@dxos/keys';
import { invariant } from '@dxos/invariant';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { Array, Effect, pipe } from 'effect';
import { snapshot } from 'effect/Metric';
import * as Registry from '@effect-atom/atom/Registry';
import React from 'react';

export interface ObjectsTreeProps {
  db: Database.Database;
  root?: Entity.Unknown;
}

export const ObjectsTree = ({ db, root }: ObjectsTreeProps) => {
  const [model, setModel] = useState(() => new ObjectsTreeModel(db, root ?? null));
  useEffect(() => {
    setModel((model) =>
      model.database === db && model.root === (root ?? null) ? model : new ObjectsTreeModel(db, root ?? null),
    );
  }, [db, root]);

  const rootNodes = useAtomValue(model.rootNodes);

  return (
    <ObjectsTreeContext.Provider value={model}>
      <div className='grid grid-cols-1 gap-2'>
        {rootNodes.map((node) => (
          <ObjectsTreeItem key={node.id} node={node} />
        ))}
      </div>
    </ObjectsTreeContext.Provider>
  );
};

const ObjectsTreeItem = ({ node }: { node: ObjectsTreeItem }) => {
  const model = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const expanded = useAtomValue(model.expanded(node.id));
  const setExpanded = useAtomSet(model.expanded(node.id));
  const children = useAtomValue(model.getChildren(node.id));
  return (
    <div>
      <div onClick={() => setExpanded((expanded) => !expanded)}>
        {children.length > 0 && (expanded ? '-' : '+')} {node.label}
      </div>
      <div className='pl-2'>{expanded && children.map((child) => <ObjectsTreeItem key={child.id} node={child} />)}</div>
    </div>
  );
};

const ObjectsTreeContext = createContext<ObjectsTreeModel | null>(null);

type ObjectsTreeItem = {
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
    return {
      id: entity.id,
      type: Obj.isObject(entity)
        ? 'object'
        : Relation.isRelation(entity) && Relation.getSource(entity).id === anchor
          ? 'outgoing-relation'
          : 'incoming-relation',
      deleted: Entity.isDeleted(entity),
      label:
        Entity.getLabel(entity) ??
        Entity.getTypename(entity) ??
        `${Obj.isObject(entity) ? 'Object' : 'Relation'}-${entity.id.slice(-4)}`,
      icon: Obj.isObject(entity) ? 'ph--cube--regular' : 'ph--arrow-right--regular',
      iconHue: 'blue',
      // TODO(dmaretskyi): Get original object from snapshot.
    };
  }
}
