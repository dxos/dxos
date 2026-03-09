//
// Copyright 2025 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import * as Option from 'effect/Option';

import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { Collection, type Database, Obj, Ref, Type } from '@dxos/echo';
import { Migrations } from '@dxos/migrations';
import { type Operation } from '@dxos/operation';
import { Node } from '@dxos/plugin-graph';
import { type TreeData } from '@dxos/react-ui-list';
import { Expando } from '@dxos/schema';
import { type Label } from '@dxos/ui-types';

import { meta } from '../../../meta';
import { SPACE_TYPE } from '../../../types';

//
// Virtual Node Types
//

export const TYPES_SECTION_TYPE = `${meta.id}/types`;
export const COLLECTIONS_SECTION_TYPE = `${meta.id}/collections`;
export const TYPE_COLLECTION_TYPE = `${meta.id}/type-collection`;
export const STATIC_SCHEMA_TYPE = `${meta.id}/static-schema`;

//
// Constants
//

export const CACHEABLE_PROPS: string[] = ['label', 'icon', 'role'];
export const ACCEPT_ECHO_CLASS: Set<string> = new Set(['echo']);

/** Shared translation namespace descriptor. */
export const META_NS: { ns: string } = { ns: meta.id };

// TODO(wittjosiah): Remove.
export const SHARED = 'shared-spaces';

//
// Stable Callbacks
//

export const BLOCK_REORDER_ABOVE = (_source: TreeData, instruction: Instruction) =>
  instruction.type === 'reorder-above';
export const CAN_DROP_SPACE = (source: TreeData) => Obj.isObject(source.item.data) || isSpace(source.item.data);
export const CAN_DROP_OBJECT = (source: TreeData) => Node.isGraphNode(source.item) && Obj.isObject(source.item.data);

//
// Matchers
//

/** Match space nodes and return the Space object. */
export const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

//
// Caching Infrastructure
//

/** Creates a string-keyed memoized factory. Returns the same instance for the same key. */
// TODO(wittjosiah): Factor out as app-graph utility.
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

/** Stable Set instances keyed by spaceId. */
export const getAcceptPersistenceKey = createFactory((spaceId: string) => new Set([spaceId]));

/** Dynamic label tuples keyed by composite key string. */
export const getDynamicLabel = createFactory(
  (key: string, ns: string, extra?: Record<string, any>): Label => [key, { ns, ...extra }],
  (key: string, ns: string, extra?: Record<string, any>) => `${key}\0${ns}${extra ? `\0${JSON.stringify(extra)}` : ''}`,
);

//
// Caches
//

export const blockInstructionCache = new Map<string, (source: TreeData, instruction: Instruction) => boolean>();
export const collectionPartialsCache = new Map<string, ReturnType<typeof buildCollectionPartials>>();
export const rearrangeCache = new Map<string, (nextOrder: unknown[]) => void>();
export const spaceActionsCache = new Map<
  string,
  {
    state: SpaceState;
    hasPendingMigration: boolean;
    migrating: boolean;
    actions: Node.NodeArg<Node.ActionData<Operation.Service>>[];
  }
>();
export const spaceRearrangeCache = new Map<string, (nextOrder: Space[]) => void>();

//
// Static Labels
//

export const ADD_VIEW_TO_SCHEMA_LABEL: Label = ['add view to schema label', META_NS];
export const COPY_LINK_LABEL: Label = ['copy link label', META_NS];
export const CREATE_OBJECT_IN_COLLECTION_LABEL: Label = ['create object in collection label', META_NS];
export const CREATE_OBJECT_IN_SPACE_LABEL: Label = ['create object in space label', META_NS];
export const EXPOSE_OBJECT_LABEL: Label = ['expose object label', META_NS];
export const MIGRATE_SPACE_LABEL: Label = ['migrate space label', META_NS];
export const PERSONAL_SPACE_LABEL: Label = ['personal space label', META_NS];
export const REMOVE_FROM_COLLECTION_LABEL: Label = ['remove from collection label', META_NS];
export const RENAME_SPACE_LABEL: Label = ['rename space label', META_NS];
export const SETTINGS_PANEL_LABEL: Label = ['settings panel label', META_NS];
export const SNAPSHOT_BY_SCHEMA_LABEL: Label = ['snapshot by schema label', META_NS];
export const UNNAMED_SPACE_LABEL: Label = ['unnamed space label', META_NS];

//
// Helpers
//

export const checkPendingMigration = (space: Space) => {
  return (
    space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION ||
    (space.state.get() === SpaceState.SPACE_READY &&
      !!Migrations.versionProperty &&
      space.properties[Migrations.versionProperty] !== Migrations.targetVersion)
  );
};

/** Returns the display label for a space (name, namesCache entry, or fallback). */
export const getSpaceDisplayName = (
  space: Space,
  { personal, namesCache = {} }: { personal?: boolean; namesCache?: Record<string, string> } = {},
): Label => {
  return space.state.get() === SpaceState.SPACE_READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name!
    : namesCache[space.id]
      ? namesCache[space.id]
      : personal
        ? PERSONAL_SPACE_LABEL
        : UNNAMED_SPACE_LABEL;
};

export const downloadBlob = async (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

/** Build collection partials for drag/drop and copy behavior. */
export const buildCollectionPartials = (
  collection: Collection.Collection,
  db: Database.Database,
  resolve: (typename: string) => Record<string, any>,
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
  resolve: (typename: string) => Record<string, any>;
}) => {
  const id = Obj.getDXN(collection).toString();
  let cached = collectionPartialsCache.get(id);
  if (!cached) {
    cached = buildCollectionPartials(collection, db, resolve);
    collectionPartialsCache.set(id, cached);
  }
  return cached;
};

/** Metadata resolver factory. */
export type MetadataResolver = (typename: string) => Record<string, any>;

// TODO(wittjosiah): Move to app-toolkit as other plugins will need this.
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

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
const cloneObject = async (
  object: Obj.Unknown,
  resolve: (typename: string) => Record<string, any>,
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
