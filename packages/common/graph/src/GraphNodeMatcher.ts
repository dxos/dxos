//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as GraphNode from './GraphNode';

/**
 * Type for a node matcher function that returns an Option of the matched data.
 * Matchers are used to filter and transform nodes in the app graph.
 *
 * Matchers receive the reactive atom context (`get`) so a match decision can
 * depend on reactive state (e.g. an ECHO query for related objects). Reading an
 * atom via `get` subscribes the extension to it, so the match re-runs when that
 * state changes. Matchers that only inspect the node itself simply ignore `get`.
 *
 * @template TData - The type of data returned when the matcher succeeds.
 *   Defaults to GraphNode.Any, but can be a more specific type (e.g., an ECHO entity).
 */
export type NodeMatcher<TData = GraphNode.Any, TNode extends GraphNode.Any = GraphNode.Any> = (
  node: TNode,
  get: Atom.AtomContext,
) => Option.Option<TData>;

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
 *   id: 'myExtension',
 *   match: GraphNodeMatcher.whenRoot,
 *   connector: (node) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenRoot = <TNode extends GraphNode.Any>(node: TNode): Option.Option<TNode> =>
  node.id === GraphNode.RootId ? Option.some(node) : Option.none();

/**
 * Matches a node by its exact ID.
 *
 * @param id - The node ID to match against.
 * @returns A matcher that returns Option.some(node) if IDs match, Option.none() otherwise.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'spacesExtension',
 *   match: GraphNodeMatcher.whenId('spaces'),
 *   connector: (node) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenId =
  (id: string) =>
  <TNode extends GraphNode.Any>(node: TNode): Option.Option<TNode> =>
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
 *   id: 'spaceSettingsExtension',
 *   match: GraphNodeMatcher.whenNodeType('org.dxos.plugin.space.settings'),
 *   connector: (node) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenNodeType =
  (type: string) =>
  <TNode extends GraphNode.Any>(node: TNode): Option.Option<TNode> =>
    node.type === type ? Option.some(node) : Option.none();

//
// Combinators
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
 * // Match settings nodes that are not the root — `whenNot` is transparent, so the result carries the node.
 * const whenSettings = GraphNodeMatcher.whenAll(
 *   GraphNodeMatcher.whenNodeType('org.dxos.plugin.space.settings'),
 *   GraphNodeMatcher.whenNot(GraphNodeMatcher.whenRoot),
 * );
 * ```
 */
export const whenAll: {
  <A, N extends GraphNode.Any>(a: NodeMatcher<A, N>, b: NodeMatcher<unknown, N>): NodeMatcher<A, N>;
  <A, N extends GraphNode.Any>(a: NodeMatcher<unknown, N>, b: NodeMatcher<A, N>): NodeMatcher<A, N>;
  <A, B, N extends GraphNode.Any>(a: NodeMatcher<A, N>, b: NodeMatcher<B, N>): NodeMatcher<A & B, N>;
  <A, B, C, N extends GraphNode.Any>(
    a: NodeMatcher<A, N>,
    b: NodeMatcher<B, N>,
    c: NodeMatcher<C, N>,
  ): NodeMatcher<A & B & C, N>;
  <A, B, C, D, N extends GraphNode.Any>(
    a: NodeMatcher<A, N>,
    b: NodeMatcher<B, N>,
    c: NodeMatcher<C, N>,
    d: NodeMatcher<D, N>,
  ): NodeMatcher<A & B & C & D, N>;
  (...matchers: NodeMatcher<any, any>[]): NodeMatcher<any, any>;
} =
  (...matchers: NodeMatcher<any, any>[]): NodeMatcher<any, any> =>
  (node: GraphNode.Any, get: Atom.AtomContext) => {
    let first: Option.Option<any> = Option.none();
    for (const candidate of matchers) {
      const result = candidate(node, get);
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
 * // Match nodes that are either the root or the spaces node
 * const whenTopLevel = GraphNodeMatcher.whenAny(
 *   GraphNodeMatcher.whenRoot,
 *   GraphNodeMatcher.whenId('spaces'),
 * );
 * ```
 */
export const whenAny: {
  <A, B, N extends GraphNode.Any>(a: NodeMatcher<A, N>, b: NodeMatcher<B, N>): NodeMatcher<A | B, N>;
  <A, B, C, N extends GraphNode.Any>(
    a: NodeMatcher<A, N>,
    b: NodeMatcher<B, N>,
    c: NodeMatcher<C, N>,
  ): NodeMatcher<A | B | C, N>;
  <A, B, C, D, N extends GraphNode.Any>(
    a: NodeMatcher<A, N>,
    b: NodeMatcher<B, N>,
    c: NodeMatcher<C, N>,
    d: NodeMatcher<D, N>,
  ): NodeMatcher<A | B | C | D, N>;
  (...matchers: NodeMatcher<any, any>[]): NodeMatcher<any, any>;
} =
  (...matchers: NodeMatcher<any, any>[]): NodeMatcher<any, any> =>
  (node: GraphNode.Any, get: Atom.AtomContext) => {
    for (const candidate of matchers) {
      const result = candidate(node, get);
      if (Option.isSome(result)) {
        return result;
      }
    }
    return Option.none();
  };

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
 * // Match any node that is NOT the root
 * const whenNotRoot = GraphNodeMatcher.whenNot(GraphNodeMatcher.whenRoot);
 * ```
 */
export const whenNot =
  <N extends GraphNode.Any>(matcher: NodeMatcher<any, N>): NodeMatcher<unknown, N> =>
  (node: N, get: Atom.AtomContext): Option.Option<unknown> =>
    Option.isNone(matcher(node, get)) ? Option.some(node) : Option.none();
