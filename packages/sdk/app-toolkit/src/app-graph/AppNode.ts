//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

export type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import type { Atom } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';

import { Node } from '@dxos/app-graph';
import { type Space } from '@dxos/client/echo';
import { Annotation, Collection, type Database, Obj, Ref, Type } from '@dxos/echo';
import { type TreeData } from '@dxos/react-ui-list';
import { type Position } from '@dxos/util';

import { NotFound } from '../app';
import { Translations } from '../app';
import { AppAnnotation } from '../echo';

//
//
// Companion types.
//

/** Plank-level companion panel node type. */
export const PLANK_COMPANION_TYPE = 'org.dxos.plugin.deck.plank-companion';

/** Deck-level (workspace-wide) companion panel node type. */
export const DECK_COMPANION_TYPE = 'org.dxos.plugin.deck.deck-companion';

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
  const id = Obj.getURI(collection);
  let cached = collectionPartialsCache.get(id);
  if (!cached) {
    cached = buildCollectionPartials(collection, db);
    collectionPartialsCache.set(id, cached);
  }
  return cached;
};

//
// makeObject.
//

/** Builds an app-graph node for an ECHO object. Uses the local object ID as the graph node ID. */
export const makeObject = ({
  get,
  db,
  object,
  disposition,
  droppable = true,
  navigable = false,
  parentCollection,
}: {
  /** Atom context from the enclosing connector — registers reactive subscriptions so property changes re-run the connector. */
  get: Atom.Context;
  db: Database.Database;
  object: Obj.Unknown;
  disposition?: string;
  droppable?: boolean;
  navigable?: boolean;
  parentCollection?: Collection.Collection;
}) => {
  const typename = Obj.getTypename(object);
  if (!typename) {
    return null;
  }

  // Obj.getType uses the stored type URI to look up the schema. For database-registered
  // (dynamic) schemas the stored TypeSchema jsonSchema.$id is the echo:/<objectId> EID, so an
  // id-based lookup can miss. Fall back to a typename query against the registry which matches
  // the TypeSchema.typename field.
  const type =
    Obj.getType(object) ??
    db.graph.registry
      .list()
      .filter(Type.isType)
      .find((t) => Type.getTypename(t) === typename);
  const schema = type && Type.getSchema(type);
  const staticIcon = schema ? Option.getOrUndefined(Annotation.IconAnnotation.get(schema)) : undefined;
  const iconFromRefProp = schema ? Option.getOrUndefined(Annotation.IconFromRefAnnotation.get(schema)) : undefined;
  // If the schema delegates its icon to a referenced sub-entity, resolve that ref's target
  // and use its schema's IconAnnotation. Falls back to the static icon if the ref is not yet loaded.
  const delegatedIcon = (() => {
    if (!iconFromRefProp) {
      return undefined;
    }
    const refValue = (object as any)?.[iconFromRefProp];
    const target = Ref.isRef(refValue) ? refValue.target : undefined;
    const targetType = target ? Obj.getType(target as Obj.Unknown) : undefined;
    return targetType ? Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(targetType))) : undefined;
  })();
  const iconAnnotation = delegatedIcon ?? staticIcon;
  const graphProps = schema ? Option.getOrUndefined(AppAnnotation.GraphPropsAnnotation.get(schema)) : undefined;

  const partials = Obj.instanceOf(Collection.Collection, object)
    ? getCollectionGraphNodePartials({ db, collection: object })
    : graphProps;

  const label =
    get(Obj.labelAtom(object)) || getDynamicLabel('object-name.placeholder', typename, { defaultValue: 'New item' });

  const selectable =
    !Obj.instanceOf(Collection.Collection, object) || (navigable && Obj.instanceOf(Collection.Collection, object));

  let onRearrange: ((nextOrder: unknown[]) => void) | undefined;
  if (parentCollection) {
    const collectionUri = Obj.getURI(parentCollection);
    onRearrange = rearrangeCache.get(collectionUri);
    if (!onRearrange) {
      onRearrange = (nextOrder: unknown[]) => {
        Obj.update(parentCollection, (parentCollection) => {
          parentCollection.objects = nextOrder.filter(Obj.isObject).map(Ref.make);
        });
      };
      rearrangeCache.set(collectionUri, onRearrange);
    }
  }

  const objectUri = Obj.getURI(object);
  let blockInstruction = blockInstructionCache.get(objectUri);
  if (!blockInstruction) {
    blockInstruction = (_source: TreeData, _instruction: Instruction) => false;
    blockInstructionCache.set(objectUri, blockInstruction);
  }

  const canDrop = droppable ? CAN_DROP_OBJECT : undefined;

  return {
    id: object.id,
    type: typename,
    cacheable: CACHEABLE_PROPS,
    data: object,
    properties: {
      label,
      icon:
        type && Type.getDatabase(type) != null
          ? 'ph--cube--regular'
          : (iconAnnotation?.icon ?? 'ph--circle-dashed--regular'),
      iconHue: type && Type.getDatabase(type) != null ? 'neutral' : iconAnnotation?.hue,
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
// Companion helpers.
//

/** Build a plank-level companion panel node. */
export const makeCompanion = <TData = string>({
  id,
  label,
  icon,
  data,
  position,
}: {
  id: string;
  label: Translations.Label;
  icon: string;
  data: TData;
  position?: Position;
}): Node.NodeArg<TData> => ({
  id,
  type: PLANK_COMPANION_TYPE,
  data,
  properties: {
    label,
    icon,
    disposition: 'hidden',
    ...(position !== undefined && { position }),
  },
});

/** Build a deck-level (workspace-wide) companion panel node. */
export const makeDeckCompanion = <TData = any>({
  id,
  label,
  icon,
  data,
  position,
  joyride,
}: {
  id: string;
  label: Translations.Label;
  icon: string;
  data: TData;
  position?: Position;
  joyride?: string;
}): Node.NodeArg<TData> => ({
  id,
  type: DECK_COMPANION_TYPE,
  data,
  properties: {
    label,
    icon,
    disposition: 'hidden',
    ...(position !== undefined && { position }),
    ...(joyride !== undefined && { joyride }),
  },
});

//
// Section helpers.
//

/** Build a virtual branch node for a space section (types, collections, mailboxes, etc.). */
export const makeSection = ({
  id,
  type,
  label,
  icon,
  iconHue = 'neutral',
  space,
  position,
  testId,
}: {
  id: string;
  type: string;
  label: Translations.Label;
  icon: string;
  iconHue?: string;
  space: Space;
  position?: Position;
  testId?: string;
}): Node.NodeArg<null> => ({
  id,
  type,
  data: null,
  properties: {
    label,
    icon,
    iconHue,
    role: 'branch',
    draggable: false,
    droppable: false,
    space,
    ...(position !== undefined && { position }),
    ...(testId !== undefined && { testId }),
  },
});

//
// Settings helpers.
//

/**
 * Build a plugin-contributed section node for the space settings panel.
 * @deprecated Use `makeSection` instead.
 */
export const makeSettingsPanel = ({
  id,
  type,
  label,
  icon,
  iconHue,
  position,
}: {
  id: string;
  type: string;
  label: Translations.Label;
  icon: string;
  /** Hue for the panel's icon. Omit to leave unset (default rendering). */
  iconHue?: string;
  position?: Position;
}): Node.NodeArg<string> => ({
  id,
  type,
  data: type,
  properties: {
    label,
    icon,
    ...(iconHue !== undefined && { iconHue }),
    ...(position !== undefined && { position }),
  },
});

//
// Not-found helpers.
//

/** Build the not-found sentinel node. */
export const makeNotFound = (): Node.NodeArg<null> => ({
  id: NotFound.NOT_FOUND_NODE_ID,
  type: NotFound.NOT_FOUND_NODE_TYPE,
  data: null,
  properties: {
    label: ['not-found.heading', { ns: 'org.dxos.i18n.os' }],
    icon: 'ph--warning--regular',
    disposition: 'hidden',
  },
});
