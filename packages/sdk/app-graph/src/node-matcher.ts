//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import { type Entity, Obj, type Type } from '@dxos/echo';

import * as Node from './node';

/**
 * Type for a node matcher function that returns an Option of the matched data.
 * Matchers are used to filter and transform nodes in the app graph.
 *
 * @template TData - The type of data returned when the matcher succeeds.
 *   Defaults to Node.Node, but can be a more specific type (e.g., an ECHO entity).
 */
export type NodeMatcher<TData = Node.Node> = (node: Node.Node) => Option.Option<TData>;

//
// Basic Node Matchers
//

/**
 * Matches the root node of the graph.
 *
 * @returns Option.some(node) if the node is the root, Option.none() otherwise.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'my-extension',
 *   match: NodeMatcher.whenRoot,
 *   connector: (node) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenRoot = (node: Node.Node): Option.Option<Node.Node> =>
  node.id === Node.RootId ? Option.some(node) : Option.none();

/**
 * Matches a node by its exact ID.
 *
 * @param id - The node ID to match against.
 * @returns A matcher that returns Option.some(node) if IDs match, Option.none() otherwise.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'spaces-extension',
 *   match: NodeMatcher.whenId('spaces'),
 *   connector: (node) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenId =
  (id: string) =>
  (node: Node.Node): Option.Option<Node.Node> =>
    node.id === id ? Option.some(node) : Option.none();

/**
 * Matches a node by its type string (the `node.type` property).
 *
 * @param type - The node type string to match against.
 * @returns A matcher that returns Option.some(node) if types match, Option.none() otherwise.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'space-settings-extension',
 *   match: NodeMatcher.whenNodeType('org.dxos.plugin.space.settings'),
 *   connector: (node) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenNodeType =
  (type: string) =>
  (node: Node.Node): Option.Option<Node.Node> =>
    node.type === type ? Option.some(node) : Option.none();

//
// ECHO Data Matchers
//

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
 *   id: 'collection-extension',
 *   match: NodeMatcher.whenEchoType(Collection.Collection),
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
  <T extends Type.AnyEntity>(type: T): NodeMatcher<Entity.Entity<Schema.Schema.Type<T>>> =>
  (node: Node.Node): Option.Option<Entity.Entity<Schema.Schema.Type<T>>> =>
    Obj.instanceOf(type, node.data) ? Option.some(node.data) : Option.none();

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
 *   id: 'object-settings',
 *   match: NodeMatcher.whenEchoObject,
 *   connector: (object) => {
 *     // `object` is typed as Obj.Unknown
 *     const id = Obj.getDXN(object).toString();
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
export const whenEchoObject = (node: Node.Node): Option.Option<Obj.Unknown> =>
  Obj.isObject(node.data) ? Option.some(node.data) : Option.none();

//
// Composition Matchers
//

/**
 * Composes multiple matchers with AND logic - all matchers must match for success.
 * The result data type is the intersection of all matchers' data types.
 * Filter matchers like {@link whenNot} return `unknown`, making them transparent
 * in the intersection (since `T & unknown = T`).
 *
 * @param matchers - The matchers to combine. All must return Option.some for success.
 * @returns A matcher whose data type is the intersection of all input matchers' data types.
 *   Returns the first matcher's value when all match, Option.none() otherwise.
 *
 * @example
 * ```ts
 * // Match ECHO objects that are NOT Channels — result is NodeMatcher<Obj.Unknown>.
 * const whenCommentable = NodeMatcher.whenAll(
 *   NodeMatcher.whenEchoObject,
 *   NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(Channel.Channel)),
 * );
 * ```
 */
export const whenAll: {
  <A>(a: NodeMatcher<A>, b: NodeMatcher<unknown>): NodeMatcher<A>;
  <A>(a: NodeMatcher<unknown>, b: NodeMatcher<A>): NodeMatcher<A>;
  <A, B>(a: NodeMatcher<A>, b: NodeMatcher<B>): NodeMatcher<A & B>;
  <A, B, C>(a: NodeMatcher<A>, b: NodeMatcher<B>, c: NodeMatcher<C>): NodeMatcher<A & B & C>;
  <A, B, C, D>(a: NodeMatcher<A>, b: NodeMatcher<B>, c: NodeMatcher<C>, d: NodeMatcher<D>): NodeMatcher<A & B & C & D>;
  (...matchers: NodeMatcher<any>[]): NodeMatcher<any>;
} =
  (...matchers: NodeMatcher<any>[]): NodeMatcher<any> =>
  (node: Node.Node) => {
    let first: Option.Option<any> = Option.none();
    for (const candidate of matchers) {
      const result = candidate(node);
      if (Option.isNone(result)) {
        return Option.none();
      }
      if (Option.isNone(first)) {
        first = result;
      }
    }
    return first;
  };

/**
 * Composes multiple matchers with OR logic - at least one matcher must match.
 * The result data type is the union of all matchers' data types.
 *
 * @param matchers - The matchers to combine. At least one must return Option.some.
 * @returns A matcher whose data type is the union of all input matchers' data types.
 *   Returns the first matching matcher's value, or Option.none() if none match.
 *
 * @example
 * ```ts
 * // Match nodes that are either Sequences or Prompts
 * const whenInvocable = NodeMatcher.whenAny(
 *   NodeMatcher.whenEchoTypeMatches(Sequence),
 *   NodeMatcher.whenEchoTypeMatches(Prompt.Prompt),
 * );
 * ```
 */
export const whenAny: {
  <A, B>(a: NodeMatcher<A>, b: NodeMatcher<B>): NodeMatcher<A | B>;
  <A, B, C>(a: NodeMatcher<A>, b: NodeMatcher<B>, c: NodeMatcher<C>): NodeMatcher<A | B | C>;
  <A, B, C, D>(a: NodeMatcher<A>, b: NodeMatcher<B>, c: NodeMatcher<C>, d: NodeMatcher<D>): NodeMatcher<A | B | C | D>;
  (...matchers: NodeMatcher<any>[]): NodeMatcher<any>;
} =
  (...matchers: NodeMatcher<any>[]): NodeMatcher<any> =>
  (node: Node.Node) => {
    for (const candidate of matchers) {
      const result = candidate(node);
      if (Option.isSome(result)) {
        return result;
      }
    }
    return Option.none();
  };

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
 * const whenPresentable = NodeMatcher.whenAny(
 *   NodeMatcher.whenEchoTypeMatches(Collection.Collection),
 *   NodeMatcher.whenEchoTypeMatches(Markdown.Document),
 * );
 *
 * // Use with whenNot for exclusion
 * const whenNotChannel = NodeMatcher.whenNot(
 *   NodeMatcher.whenEchoTypeMatches(Channel.Channel),
 * );
 * ```
 *
 * @see {@link whenEchoType} - Use instead when you need the typed entity directly.
 */
export const whenEchoTypeMatches =
  <T extends Type.AnyEntity>(type: T): NodeMatcher =>
  (node: Node.Node): Option.Option<Node.Node> =>
    Obj.instanceOf(type, node.data) ? Option.some(node) : Option.none();

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
 * const whenUserObject = NodeMatcher.whenAll(
 *   NodeMatcher.whenEchoObjectMatches,
 *   NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(SystemType)),
 * );
 * ```
 *
 * @see {@link whenEchoObject} - Use instead when you need the object data directly.
 */
export const whenEchoObjectMatches = (node: Node.Node): Option.Option<Node.Node> =>
  Obj.isObject(node.data) ? Option.some(node) : Option.none();

/**
 * Negates a matcher - matches when the given matcher does NOT match.
 * Useful for exclusion patterns like "any object EXCEPT type X".
 *
 * Returns `NodeMatcher<unknown>` because negation is a filter — it doesn't provide
 * typed data. This makes it transparent in {@link whenAll} intersections
 * (since `T & unknown = T`).
 *
 * @param matcher - The matcher to negate.
 * @returns A matcher that returns Option.some(node) if the input matcher returns none,
 *   and Option.none() if the input matcher returns some.
 *
 * @example
 * ```ts
 * // Match any ECHO object that is NOT a Channel — result is NodeMatcher<Obj.Unknown>.
 * const whenCommentable = NodeMatcher.whenAll(
 *   NodeMatcher.whenEchoObject,
 *   NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(Channel.Channel)),
 * );
 *
 * // Match any node that is NOT the root
 * const whenNotRoot = NodeMatcher.whenNot(NodeMatcher.whenRoot);
 * ```
 */
export const whenNot =
  (matcher: NodeMatcher<any>): NodeMatcher<unknown> =>
  (node: Node.Node): Option.Option<unknown> =>
    Option.isNone(matcher(node)) ? Option.some(node) : Option.none();
