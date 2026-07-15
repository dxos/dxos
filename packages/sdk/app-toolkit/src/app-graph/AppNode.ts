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
import { CollectionItemAnnotation } from '@dxos/schema';
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
    const key = keyFn ? keyFn(...args) : String(args[0]);
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

/**
 * Returns true when the object is eligible to live inside a collection:
 * collections are always eligible; other types require {@link CollectionItemAnnotation}.
 */
export const isCollectionItem = (object: Obj.Unknown): boolean => {
  if (Obj.instanceOf(Collection.Collection, object)) {
    return true;
  }
  const type = Obj.getType(object);
  if (!type) {
    return false;
  }
  return CollectionItemAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false));
};

/** Like {@link CAN_DROP_OBJECT} but restricted to collection-eligible types. */
export const CAN_DROP_COLLECTION_ITEM = (source: TreeData) =>
  Node.isGraphNode(source.item) && Obj.isObject(source.item.data) && isCollectionItem(source.item.data);

//
// Module-level caches.
//

export const blockInstructionCache = new Map<string, (source: TreeData, instruction: Instruction) => boolean>();
export const collectionPartialsCache = new Map<string, ReturnType<typeof buildCollectionPartials>>();

/** Stable rearrange callback that reorders a Collection's objects array. Keyed by collection URI. */
export const makeCollectionRearrangeCallback = createFactory(
  (collection: Collection.Collection) => (nextOrder: unknown[]) => {
    Obj.update(collection, (collection) => {
      collection.objects = nextOrder.filter(Obj.isObject).map(Ref.make);
    });
  },
  (collection) => Obj.getURI(collection),
);

//
// Collection partials.
//

/** Build collection partials for drag/drop behavior. */
export const buildCollectionPartials = (collection: Collection.Collection, db: Database.Database) => ({
  acceptPersistenceClass: ACCEPT_ECHO_CLASS,
  acceptPersistenceKey: getAcceptPersistenceKey(db.spaceId),
  role: 'branch' as const,
  canDrop: CAN_DROP_COLLECTION_ITEM,
  onTransferStart: (child: Node.Node<Obj.Unknown>, index?: number) => {
    if (!isCollectionItem(child.data)) {
      return;
    }
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
  draggable = true,
  droppable = true,
  navigable = false,
  onRearrange,
  canDrop: canDropOverride,
}: {
  /** Atom context from the enclosing connector — registers reactive subscriptions so property changes re-run the connector. */
  get: Atom.Context;
  db: Database.Database;
  object: Obj.Unknown;
  disposition?: string;
  draggable?: boolean;
  droppable?: boolean;
  navigable?: boolean;
  /** Rearrange callback invoked with the next sibling order on drop. */
  onRearrange?: (nextOrder: unknown[]) => void;
  /** Overrides the default {@link CAN_DROP_OBJECT} drop predicate (e.g. to restrict siblings to collection items). */
  canDrop?: (source: TreeData) => boolean;
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

  const objectUri = Obj.getURI(object);
  let blockInstruction = blockInstructionCache.get(objectUri);
  if (!blockInstruction) {
    blockInstruction = (_source: TreeData, _instruction: Instruction) => false;
    blockInstructionCache.set(objectUri, blockInstruction);
  }

  const canDrop = droppable ? (canDropOverride ?? CAN_DROP_OBJECT) : undefined;

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
      draggable: draggable ? undefined : false,
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
  position?: Position.Position;
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
  position?: Position.Position;
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
// Group helpers.
//

/**
 * Build a navtree section-group node.
 * Group nodes render as a dense uppercase label with their children always
 * visible at the same visual level (disposition='group').  The space is stored
 * in properties so child connectors can retrieve it without an extra graph lookup.
 */
export const makeGroup = ({
  id,
  type,
  label,
  space,
  position,
}: {
  id: string;
  type: string;
  label: Translations.Label;
  space: Space;
  position?: Position.Position;
}): Node.NodeArg<null> => ({
  id,
  type,
  data: null,
  properties: {
    label,
    disposition: 'group',
    draggable: false,
    droppable: false,
    space,
    ...(position !== undefined && { position }),
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
  position?: Position.Position;
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
  position?: Position.Position;
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
// Toolbar action helpers.
//

// Mirrors `TOOLBAR_DISPOSITION`/`MenuSeparatorType` in `@dxos/react-ui-menu` — duplicated rather
// than imported so this foundational package doesn't gain a new dependency edge on a UI package.
const TOOLBAR_DISPOSITION = 'toolbar';
const MENU_SEPARATOR_TYPE = '@dxos/react-ui-toolbar/separator';

/**
 * Build a toolbar action node — a graph action that opts into the object toolbar
 * (`disposition: 'toolbar'`) instead of context-menu-only placement. Return these from a
 * `GraphBuilder.createExtension`/`createTypeExtension` `actions:` callback.
 *
 * @idiom org.dxos.app-toolkit.toolbarGraphAction
 *   applies: Contributing a toolbar action from an app-graph-builder extension
 *   instead-of: Hand-rolling `Node.makeAction({ ..., properties: { disposition: 'toolbar', ... } })`
 *   uses: {@link makeToolbarAction}
 *   related: org.dxos.react-ui-menu.graphActionsToolbar
 */
export const makeToolbarAction = <R = never>({
  id,
  label,
  icon,
  data,
  disabled,
  testId,
  keyBinding,
}: {
  id: string;
  label: Translations.Label;
  icon?: string;
  data: Node.ActionData<R>;
  disabled?: boolean;
  testId?: string;
  keyBinding?: string;
}): Node.NodeArg<Node.ActionData<R>> =>
  Node.makeAction({
    id,
    data,
    properties: {
      label,
      disposition: TOOLBAR_DISPOSITION,
      ...(icon !== undefined && { icon }),
      ...(disabled !== undefined && { disabled }),
      ...(testId !== undefined && { testId }),
      ...(keyBinding !== undefined && { keyBinding }),
    },
  });

/**
 * Build a toolbar action-GROUP node (a dropdown of child actions) that opts into the object
 * toolbar. Unlike a flat {@link makeToolbarAction}, a group MUST be returned from a `connector:`
 * extension callback — not `actions:`, which always stamps `type: Node.ActionType` on every
 * returned node and would clobber the group's type — with the extension's `relation` set to
 * `Node.actionRelation()` so `graph.actions(nodeId)` picks the group up as one of the node's
 * actions. The group's own nested `actions` are wired automatically by `@dxos/app-graph` (it
 * recurses into any `NodeArg.actions` field), so the children need no separate extension.
 */
export const makeToolbarActionGroup = ({
  id,
  label,
  icon,
  iconOnly = true,
  testId,
  actions,
}: {
  id: string;
  label: Translations.Label;
  icon?: string;
  /** Render the trigger as icon-only (label becomes tooltip/aria). Defaults to `true` for compact
   * toolbars; set `false` to show the label text next to the icon. */
  iconOnly?: boolean;
  /** Test id for the group's dropdown trigger. */
  testId?: string;
  actions: Node.NodeArg<Node.ActionData<any>>[];
}): Node.NodeArg<typeof Node.actionGroupSymbol> =>
  Node.makeActionGroup({
    id,
    actions,
    properties: {
      label,
      // Without `variant: 'dropdownMenu'`, `Menu`/`ToolbarMenu` renders a group as a toggle-button
      // group (radio/checkbox semantics) instead of an actual dropdown — the group would render but
      // clicking it would do nothing, since toggle groups don't invoke arbitrary action callbacks.
      variant: 'dropdownMenu',
      iconOnly,
      disposition: TOOLBAR_DISPOSITION,
      ...(icon !== undefined && { icon }),
      ...(testId !== undefined && { testId }),
    },
  });

/** Build a separator node for a {@link makeToolbarActionGroup}'s `actions` list, e.g. between a
 * "reuse existing" section and a "connect new" section. Carries `disposition: 'toolbar'` so it
 * survives the `isToolbarAction` filter alongside the actions it separates. */
export const makeToolbarSeparator = (
  id: string,
  variant: 'gap' | 'line' = 'line',
): Node.NodeArg<Node.ActionData<any>> => ({
  id,
  type: MENU_SEPARATOR_TYPE,
  properties: { variant, disposition: TOOLBAR_DISPOSITION },
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
