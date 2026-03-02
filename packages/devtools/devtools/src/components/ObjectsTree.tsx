//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { Filter, Query, type Database, Entity, Relation, Obj, Annotation } from '@dxos/echo';
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
import { getStyles } from '@dxos/ui-theme';
import * as Schema from 'effect/Schema';
import { dbg } from '@dxos/log';

export interface ObjectsTreeProps {
  db: Database.Database;
  root?: Entity.Unknown;
  onSelect?: (entity: Entity.Snapshot) => void;
}

export const ObjectsTree = ({ db, root, onSelect }: ObjectsTreeProps) => {
  const [model, setModel] = useState(() => new ObjectsTreeModel(db, root ?? null, onSelect ?? (() => {})));
  useEffect(() => {
    setModel((prev) =>
      prev.database === db && prev.root === (root ?? null)
        ? prev
        : new ObjectsTreeModel(db, root ?? null, onSelect ?? (() => {})),
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
          <ObjectsTreeRow key={node.id} node={node} level={1} />
        ))}
      </Treegrid.Root>
    </ObjectsTreeContext.Provider>
  );
};

const ObjectsTreeRow = ({ node, level }: { node: ObjectsTreeItem; level: number }) => {
  const model = useContext(ObjectsTreeContext) ?? raise(new Error('ObjectsTreeContext not found'));
  const expanded = useAtomValue(model.expanded(node.id, level));
  const setExpanded = useAtomSet(model.expanded(node.id, level));
  const children = useAtomValue(model.getChildren(node.id));
  const hasChildren = children.length > 0;
  const parentOf = hasChildren ? children.map((child) => child.id).join(Treegrid.PARENT_OF_SEPARATOR) : undefined;

  const styles = node.iconHue ? getStyles(node.iconHue) : undefined;

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
        <div
          role='none'
          className='indent relative grid grid-cols-subgrid col-[tree-row]'
          style={paddingIndentation(level)}
        >
          <Treegrid.Cell indent classNames='flex items-center gap-1 min-w-0'>
            <TreeItemToggle isBranch={hasChildren} open={expanded} onClick={() => setExpanded((prev) => !prev)} />
            {node.type === 'outgoing-relation' && (
              <Icon icon='ph--arrow-right--regular' classNames='shrink-0 w-4 h-4 opacity-70' />
            )}
            {node.type === 'incoming-relation' && (
              <Icon icon='ph--arrow-left--regular' classNames='shrink-0 w-4 h-4 opacity-70' />
            )}
            <Icon icon={node.icon} classNames={['shrink-0 w-4 h-4', styles?.surfaceText]} />
            <span className={node.deleted ? 'line-through opacity-60' : 'truncate'}>{node.label}</span>
          </Treegrid.Cell>
        </div>
      </Treegrid.Row>
      {expanded && children.map((child, index) => <ObjectsTreeRow key={child.id} node={child} level={level + 1} />)}
    </>
  );
};
ObjectsTreeRow.displayName = 'ObjectsTreeRow';

const ObjectsTreeContext = createContext<ObjectsTreeModel | null>(null);

export type ObjectsTreeItem = {
  id: string;
  type: 'object' | 'outgoing-relation' | 'incoming-relation';
  deleted: boolean;
  label: string;
  icon: string;
  iconHue?: string;
  entity: Entity.Snapshot;
};

const ExpandedKeySchema = Schema.TemplateLiteralParser(
  // id
  Schema.String,
  '-',
  // level
  Schema.Number,
);

const AUTO_EXPAND_LEVEL = 3;

class ObjectsTreeModel {
  #onSelect: (entity: Entity.Snapshot) => void;
  #database: Database.Database;
  #root: Entity.Unknown | null;
  #atoms = Atom.family((anchor: string | null) => this.#makeNodeAtom(anchor));
  #expandedState = Atom.family((key: string) => {
    const [id, _, level] = Schema.decodeUnknownSync(ExpandedKeySchema)(key);
    if (level <= AUTO_EXPAND_LEVEL) {
      return Atom.make(true);
    } else {
      return Atom.make(false);
    }
  });

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
    if (typeof anchor === 'string') {
      invariant(ObjectId.isValid(anchor));

      const entities: Atom.Atom<Entity.Unknown[]> = AtomQuery.fromQuery(
        this.#database.query(
          Query.all(
            Query.select(Filter.id(anchor)).children(),
            Query.select(Filter.id(anchor)).sourceOf(),
            Query.select(Filter.id(anchor)).targetOf(),
          )
            .options({
              deleted: 'include',
            })
            .from(this.#database),
        ),
      );

      return Atom.make((get) =>
        pipe(
          get(entities),
          Array.map((entity) => AtomObj.make(entity).pipe(get)),
          Array.map((entity) => this.#mapEntityToTreeItems(entity, anchor)),
        ),
      );
    } else if (this.#root !== null) {
      return AtomObj.make(this.#root).pipe((_) => Atom.make((get) => [this.#mapEntityToTreeItems(get(_), null)]));
    } else {
      console.log('get all');
      const entities: Atom.Atom<Entity.Unknown[]> = AtomQuery.fromQuery(
        this.#database.query(Query.select(Filter.everything()).options({ deleted: 'include' }).from(this.#database)),
      );

      return Atom.make((get) =>
        pipe(
          get(entities),
          (_) => dbg(_),
          Array.filter(Obj.isObject),
          Array.map((entity) => AtomObj.make(entity).pipe(get)),
          Array.map((entity) => this.#mapEntityToTreeItems(entity, null)),
        ),
      );
    }
  }

  #mapEntityToTreeItems(entity: Entity.Snapshot, anchor: string | null): ObjectsTreeItem {
    const { icon, hue } = Option.fromNullable(Obj.getSchema(entity)).pipe(
      Option.flatMap(Annotation.IconAnnotation.get),
      Option.getOrElse(() => ({
        icon: Obj.isSnapshot(entity) ? DEFAULT_OBJECT_ICON : DEFAULT_RELATION_ICON,
        hue: undefined,
      })),
    );
    return {
      id: entity.id,
      type: Relation.isSnapshot(entity)
        ? Relation.getSource(entity).id === anchor
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

const DEFAULT_OBJECT_ICON = 'ph--cube--regular';
const DEFAULT_RELATION_ICON = 'ph--link--regular';
