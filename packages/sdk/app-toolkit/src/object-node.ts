//
// Copyright 2025 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import { Node } from '@dxos/app-graph';
import { Collection, type Database, Obj, Ref, Type } from '@dxos/echo';
import { type TreeData } from '@dxos/react-ui-list';
import { Expando } from '@dxos/schema';
/** Resolves metadata for a given typename. */
export type MetadataResolver = (typename: string) => Record<string, any>;

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

/** Build collection partials for drag/drop and copy behavior. */
export const buildCollectionPartials = (
  collection: Collection.Collection,
  db: Database.Database,
  resolve: MetadataResolver,
) => ({
  acceptPersistenceClass: ACCEPT_ECHO_CLASS,
  acceptPersistenceKey: getAcceptPersistenceKey(db.spaceId),
  role: 'branch' as const,
  onTransferStart: (child: Node.Node<Obj.Unknown>, index?: number) => {
    Obj.change(collection, (mutable) => {
      if (!mutable.objects.find((object) => object.target === child.data)) {
        if (typeof index !== 'undefined') {
          mutable.objects.splice(index, 0, Ref.make(child.data));
        } else {
          mutable.objects.push(Ref.make(child.data));
        }
      }
    });
  },
  onTransferEnd: (child: Node.Node<Obj.Unknown>, _destination: Node.Node) => {
    Obj.change(collection, (mutable) => {
      const idx = mutable.objects.findIndex((object) => object.target === child.data);
      if (idx > -1) {
        mutable.objects.splice(idx, 1);
      }
    });
  },
  onCopy: async (child: Node.Node<Obj.Unknown>, index?: number) => {
    const newObject = await cloneObject(child.data, resolve, db);
    db.add(newObject);
    Obj.change(collection, (mutable) => {
      if (typeof index !== 'undefined') {
        mutable.objects.splice(index, 0, Ref.make(newObject));
      } else {
        mutable.objects.push(Ref.make(newObject));
      }
    });
  },
});

export const getCollectionGraphNodePartials = ({
  collection,
  db,
  resolve,
}: {
  collection: Collection.Collection;
  db: Database.Database;
  resolve: MetadataResolver;
}) => {
  const id = Obj.getDXN(collection).toString();
  let cached = collectionPartialsCache.get(id);
  if (!cached) {
    cached = buildCollectionPartials(collection, db, resolve);
    collectionPartialsCache.set(id, cached);
  }
  return cached;
};

//
// createObjectNode.
//

/** Builds an app-graph node for an ECHO object. */
export const createObjectNode = ({
  db,
  object,
  disposition,
  droppable = true,
  navigable = false,
  resolve,
  parentCollection,
}: {
  db: Database.Database;
  object: Obj.Unknown;
  disposition?: string;
  droppable?: boolean;
  navigable?: boolean;
  resolve: MetadataResolver;
  parentCollection?: Collection.Collection;
}) => {
  const type = Obj.getTypename(object);
  if (!type) {
    return null;
  }

  const metadata = resolve(type);
  const partials = Obj.instanceOf(Collection.Collection, object)
    ? getCollectionGraphNodePartials({ collection: object, db, resolve })
    : metadata.graphProps;

  const label =
    (object as any).name ||
    Obj.getLabel(object) ||
    metadata.label?.(object) ||
    getDynamicLabel('object name placeholder', type, { default: 'New item' });

  const selectable =
    !Obj.instanceOf(Collection.Collection, object) || (navigable && Obj.instanceOf(Collection.Collection, object));

  let onRearrange: ((nextOrder: unknown[]) => void) | undefined;
  if (parentCollection) {
    const collectionId = Obj.getDXN(parentCollection).toString();
    onRearrange = rearrangeCache.get(collectionId);
    if (!onRearrange) {
      onRearrange = (nextOrder: unknown[]) => {
        Obj.change(parentCollection, (mutable) => {
          mutable.objects = nextOrder.filter(Obj.isObject).map(Ref.make);
        });
      };
      rearrangeCache.set(collectionId, onRearrange);
    }
  }

  const objectId = Obj.getDXN(object).toString();
  let blockInstruction = blockInstructionCache.get(objectId);
  if (!blockInstruction) {
    blockInstruction = (_source: TreeData, _instruction: Instruction) => false;
    blockInstructionCache.set(objectId, blockInstruction);
  }

  const canDrop = droppable ? CAN_DROP_OBJECT : undefined;

  return {
    id: Obj.getDXN(object).toString(),
    type,
    cacheable: CACHEABLE_PROPS,
    data: object,
    properties: {
      label,
      icon: metadata.icon ?? 'ph--placeholder--regular',
      iconHue: metadata.iconHue,
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

//
// Internal helpers.
//

/** @deprecated Workaround for ECHO not supporting clone. */
const cloneObject = async (
  object: Obj.Unknown,
  resolve: MetadataResolver,
  newDb: Database.Database,
): Promise<Obj.Unknown> => {
  const schema = Obj.getSchema(object);
  const typename = schema ? (Type.getTypename(schema) ?? Expando.Expando.typename) : Expando.Expando.typename;
  const metadata = resolve(typename);
  const serializer = metadata.serializer;
  if (!serializer) {
    throw new Error(`No serializer for type: ${typename}`);
  }
  const content = await serializer.serialize({ object });
  return serializer.deserialize({ content, db: newDb, newId: true });
};
