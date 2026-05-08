//
// Copyright 2025 DXOS.org
//

import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import * as Option from 'effect/Option';

import { Node } from '@dxos/app-graph';
import { Collection, type Database, Obj, Ref } from '@dxos/echo';
import { Annotation } from '@dxos/echo';
import { type TreeData } from '@dxos/react-ui-list';

import { GraphPropsAnnotation } from '@dxos/app-framework';

//
// Caching infrastructure.
//

/** Creates a string-keyed memoized factory. Returns the same instance for the same key. */
export function createFactory<T>(create: (key: string) => T): (key: string) => T;
export function createFactory<TArgs extends any[], T>(
  create: (...args: TArgs) => T,
  keyFn: (...args: TArgs) => string,
): (...args: TArgs) => T;
export function createFactory<TArgs extends any[], T>(
  create: (...args: TArgs) => T,
  keyFn?: (...args: TArgs) => string,
): (...args: TArgs) => T {
  const cache = new Map<string, T>();
  return (...args: TArgs) => {
    const key = keyFn ? keyFn(...args) : (args[0] as string);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const value = create(...args);
    cache.set(key, value);
    return value;
  };
}

/** Dynamic label tuples keyed by composite key string. */
export const getDynamicLabel = createFactory(
  (key: string, ns: string, extra?: Record<string, any>): [string, Record<string, any>] => [key, { ns, ...extra }],
  (key: string, ns: string, extra?: Record<string, any>) => `${key}\0${ns}${extra ? `\0${JSON.stringify(extra)}` : ''}`,
);

//
// Constants and stable callbacks.
//

export const CACHEABLE_PROPS: string[] = ['label', 'icon', 'role'];
export const ACCEPT_ECHO_CLASS: Set<string> = new Set(['echo']);

/** Stable Set instances keyed by spaceId. */
export const getAcceptPersistenceKey = createFactory((spaceId: string) => new Set([spaceId]));

export const CAN_DROP_OBJECT = (source: TreeData) => Node.isGraphNode(source.item) && Obj.isObject(source.item.data);

//
// Module-level caches.
//

export const blockInstructionCache = new Map<string, (source: TreeData, instruction: Instruction) => boolean>();
export const collectionPartialsCache = new Map<string, ReturnType<typeof buildCollectionPartials>>();
export const rearrangeCache = new Map<string, (nextOrder: unknown[]) => void>();

//
// Collection partials.
//

/** Build collection partials for drag/drop behavior. */
export const buildCollectionPartials = (collection: Collection.Collection, db: Database.Database) => ({
  acceptPersistenceClass: ACCEPT_ECHO_CLASS,
  acceptPersistenceKey: getAcceptPersistenceKey(db.spaceId),
  role: 'branch' as const,
  onTransferStart: (child: Node.Node<Obj.Unknown>, index?: number) => {
    Obj.update(collection, (collection) => {
      if (!collection.objects.find((object) => object.target === child.data)) {
        if (typeof index !== 'undefined') {
          collection.objects.splice(index, 0, Ref.make(child.data));
        } else {
          collection.objects.push(Ref.make(child.data));
        }
      }
    });
  },
  onTransferEnd: (child: Node.Node<Obj.Unknown>, _destination: Node.Node) => {
    Obj.update(collection, (collection) => {
      const idx = collection.objects.findIndex((object) => object.target === child.data);
      if (idx > -1) {
        collection.objects.splice(idx, 1);
      }
    });
  },
  // TODO(wittjosiah): Reimplement once ECHO supports native object cloning.
  // onCopy: async (child: Node.Node<Obj.Unknown>, index?: number) => {
  //   const newObject = await cloneObject(child.data, resolve, db);
  //   db.add(newObject);
  //   Obj.update(collection, (collection) => {
  //     if (typeof index !== 'undefined') {
  //       collection.objects.splice(index, 0, Ref.make(newObject));
  //     } else {
  //       collection.objects.push(Ref.make(newObject));
  //     }
  //   });
  // },
});

export const getCollectionGraphNodePartials = ({
  db,
  collection,
}: {
  db: Database.Database;
  collection: Collection.Collection;
}) => {
  const id = Obj.getDXN(collection).toString();
  let cached = collectionPartialsCache.get(id);
  if (!cached) {
    cached = buildCollectionPartials(collection, db);
    collectionPartialsCache.set(id, cached);
  }
  return cached;
};

//
// createObjectNode.
//

/** Builds an app-graph node for an ECHO object. Uses the local object ID as the graph node ID. */
export const createObjectNode = ({
  db,
  object,
  disposition,
  droppable = true,
  navigable = false,
  parentCollection,
}: {
  db: Database.Database;
  object: Obj.Unknown;
  disposition?: string;
  droppable?: boolean;
  navigable?: boolean;
  parentCollection?: Collection.Collection;
}) => {
  const type = Obj.getTypename(object);
  if (!type) {
    return null;
  }

  const schema = Obj.getSchema(object);
  const iconAnnotation = schema ? Option.getOrUndefined(Annotation.IconAnnotation.get(schema)) : undefined;
  const graphProps = schema ? Option.getOrUndefined(GraphPropsAnnotation.get(schema)) : undefined;

  const partials = Obj.instanceOf(Collection.Collection, object)
    ? getCollectionGraphNodePartials({ db, collection: object })
    : graphProps;

  const label = Obj.getLabel(object) || getDynamicLabel('object-name.placeholder', type, { defaultValue: 'New item' });

  const selectable =
    !Obj.instanceOf(Collection.Collection, object) || (navigable && Obj.instanceOf(Collection.Collection, object));

  let onRearrange: ((nextOrder: unknown[]) => void) | undefined;
  if (parentCollection) {
    const collectionDxn = Obj.getDXN(parentCollection).toString();
    onRearrange = rearrangeCache.get(collectionDxn);
    if (!onRearrange) {
      onRearrange = (nextOrder: unknown[]) => {
        Obj.update(parentCollection, (parentCollection) => {
          parentCollection.objects = nextOrder.filter(Obj.isObject).map(Ref.make);
        });
      };
      rearrangeCache.set(collectionDxn, onRearrange);
    }
  }

  const objectDxn = Obj.getDXN(object).toString();
  let blockInstruction = blockInstructionCache.get(objectDxn);
  if (!blockInstruction) {
    blockInstruction = (_source: TreeData, _instruction: Instruction) => false;
    blockInstructionCache.set(objectDxn, blockInstruction);
  }

  const canDrop = droppable ? CAN_DROP_OBJECT : undefined;

  return {
    id: object.id,
    type,
    cacheable: CACHEABLE_PROPS,
    data: object,
    properties: {
      label,
      icon: iconAnnotation?.icon ?? 'ph--placeholder--regular',
      iconHue: iconAnnotation?.hue,
      disposition,
      testId: 'spacePlugin.object',
      persistenceClass: 'echo',
      persistenceKey: db.spaceId,
      selectable,
      droppable: droppable ? undefined : false,
      onRearrange,
      blockInstruction,
      canDrop,
      ...partials,
    },
  };
};
