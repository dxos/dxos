//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { type Space, isSpace } from '@dxos/client/echo';
import { Entity, Obj, type Type } from '@dxos/echo';
import type * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

/** A matcher over app-graph nodes. */
type Matcher<TData> = GraphNodeMatcher.NodeMatcher<TData, AppGraphNode.Node>;

/**
 * Canonical app-graph node type for `Space` data nodes. Mirrors
 * `SPACE_TYPE` in `@dxos/plugin-space` — kept here so app-toolkit
 * matchers don't have to depend on plugin-space.
 */
const SPACE_NODE_TYPE = 'org.dxos.type.space';

/** Canonical type for the space-settings virtual section node. */
export const SETTINGS_SECTION_TYPE = 'org.dxos.plugin.space.settings';

/**
 * Match space nodes and return the {@link Space} payload — saves callers from
 * unwrapping `node.data` themselves and adds an `isSpace` runtime guard.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'mySpaceSection',
 *   match: AppNodeMatcher.whenSpace,
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenSpace = (node: AppGraphNode.Node): Option.Option<Space> =>
  node.type === SPACE_NODE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

/**
 * Match space-settings section nodes and return the {@link Space} stored in
 * `node.properties.space`. The settings section carries the space in its
 * properties (not `node.data`) so child extensions can access it without an
 * additional graph lookup.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'mySettingsPanel',
 *   match: AppNodeMatcher.whenSpaceSettings,
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenSpaceSettings = (node: AppGraphNode.Node): Option.Option<Space> => {
  const maybeSpace = node.properties.space;
  return node.type === SETTINGS_SECTION_TYPE && isSpace(maybeSpace) ? Option.some(maybeSpace) : Option.none();
};

/**
 * Match navtree section-group nodes of a specific type and return the {@link Space}
 * stored in `node.properties.space`.  Group nodes carry the space in properties
 * (not `node.data`) so child connectors can access it without an extra graph lookup.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'myAiSection',
 *   match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenNavTreeGroup =
  (groupType: string) =>
  (node: AppGraphNode.Node): Option.Option<Space> => {
    const maybeSpace = node.properties.space;
    return node.type === groupType && isSpace(maybeSpace) ? Option.some(maybeSpace) : Option.none();
  };

/**
 * Matches a node whose data is an instance of the given ECHO schema type.
 * Returns the **typed entity data** (not the node) for direct use in callbacks.
 *
 * Use this when you need to work directly with the typed ECHO entity in your
 * connector or actions callback.
 *
 * @template T - The ECHO schema type to match against.
 * @param type - The ECHO schema (e.g., `Collection.Collection`, `Document.Document`).
 * @returns A matcher that returns Option.some(entity) if the data matches, Option.none() otherwise.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'collectionExtension',
 *   match: AppNodeMatcher.whenEchoType(Collection.Collection),
 *   connector: (collection) => {
 *     // `collection` is typed as Collection.Collection
 *     return Effect.succeed(collection.objects.map(...));
 *   },
 * });
 * ```
 *
 * Can be composed directly with {@link whenAll}/{@link whenAny}/{@link whenNot} while
 * preserving the typed entity data in the result.
 *
 * @see {@link whenEchoTypeMatches} - Returns the node instead of data for legacy composition.
 */
export const whenEchoType =
  <T extends Type.AnyEntity>(type: T): Matcher<Type.InstanceType<T>> =>
  (node: AppGraphNode.Node): Option.Option<Type.InstanceType<T>> =>
    Entity.instanceOf(type, node.data) ? Option.some(node.data) : Option.none();

/**
 * Matches a node whose data is any ECHO object.
 * Returns the **object data** (not the node) for direct use in callbacks.
 *
 * Use this when you need to work with any ECHO object regardless of its specific type.
 *
 * @returns Option.some(object) if the node's data is an ECHO object, Option.none() otherwise.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'objectProperties',
 *   match: AppNodeMatcher.whenEchoObject,
 *   connector: (object) => {
 *     // `object` is typed as Obj.Unknown
 *     const id = Obj.getURI(object);
 *     return Effect.succeed([{ id: `${id}.settings`, ... }]);
 *   },
 * });
 * ```
 *
 * Can be composed directly with {@link whenAll}/{@link whenAny}/{@link whenNot} while
 * preserving the `Obj.Unknown` data type in the result.
 *
 * @see {@link whenEchoObjectMatches} - Returns the node instead of data for legacy composition.
 */
export const whenEchoObject = (node: AppGraphNode.Node): Option.Option<Obj.Unknown> =>
  Obj.isObject(node.data) ? Option.some(node.data) : Option.none();

//
// Composition Matchers
//

/**
 * Matches a node whose data is an instance of the given ECHO schema type.
 * Returns the **node** (not the data) to enable composition with whenAll/whenAny/whenNot.
 *
 * Use this instead of {@link whenEchoType} when you need to combine matchers.
 * The difference is what's returned:
 * - `whenEchoType` returns the typed entity (for direct use)
 * - `whenEchoTypeMatches` returns the node (for composition)
 *
 * @template T - The ECHO schema type to match against.
 * @param type - The ECHO schema (e.g., `Channel.Channel`, `Document.Document`).
 * @returns A matcher that returns Option.some(node) if the data matches, Option.none() otherwise.
 *
 * @example
 * ```ts
 * // Use with whenAny for OR logic
 * const whenPresentable = GraphNodeMatcher.whenAny(
 *   AppNodeMatcher.whenEchoTypeMatches(Collection.Collection),
 *   AppNodeMatcher.whenEchoTypeMatches(Markdown.Document),
 * );
 *
 * // Use with whenNot for exclusion
 * const whenNotChannel = GraphNodeMatcher.whenNot(
 *   AppNodeMatcher.whenEchoTypeMatches(Channel.Channel),
 * );
 * ```
 *
 * @see {@link whenEchoType} - Use instead when you need the typed entity directly.
 */
export const whenEchoTypeMatches =
  <T extends Type.AnyObj | Type.AnyRelation>(type: T): Matcher<AppGraphNode.Node> =>
  (node: AppGraphNode.Node): Option.Option<AppGraphNode.Node> =>
    Entity.instanceOf(type, node.data) ? Option.some(node) : Option.none();

/**
 * Matches a node whose data is any ECHO object.
 * Returns the **node** (not the data) to enable composition with whenAll/whenAny/whenNot.
 *
 * Use this instead of {@link whenEchoObject} when you need to combine matchers.
 * The difference is what's returned:
 * - `whenEchoObject` returns the object data (for direct use)
 * - `whenEchoObjectMatches` returns the node (for composition)
 *
 * @returns Option.some(node) if the node's data is an ECHO object, Option.none() otherwise.
 *
 * @example
 * ```ts
 * // Match ECHO objects that are not system types
 * const whenUserObject = GraphNodeMatcher.whenAll(
 *   AppNodeMatcher.whenEchoObjectMatches,
 *   GraphNodeMatcher.whenNot(AppNodeMatcher.whenEchoTypeMatches(SystemType)),
 * );
 * ```
 *
 * @see {@link whenEchoObject} - Use instead when you need the object data directly.
 */
export const whenEchoObjectMatches = (node: AppGraphNode.Node): Option.Option<AppGraphNode.Node> =>
  Obj.isObject(node.data) ? Option.some(node) : Option.none();
