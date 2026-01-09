//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import { type Entity, Obj, type Type } from '@dxos/echo';

import * as Node from './node';

/**
 * Type for a node matcher function that returns an Option of the matched data.
 */
export type NodeMatcher<TData = Node.Node> = (node: Node.Node) => Option.Option<TData>;

/**
 * Match the root node.
 */
export const whenRoot = (node: Node.Node): Option.Option<Node.Node> =>
  node.id === Node.RootId ? Option.some(node) : Option.none();

/**
 * Match a node by its ID.
 */
export const whenId =
  (id: string) =>
  (node: Node.Node): Option.Option<Node.Node> =>
    node.id === id ? Option.some(node) : Option.none();

/**
 * Match a node by its type.
 */
export const whenNodeType =
  (type: string) =>
  (node: Node.Node): Option.Option<Node.Node> =>
    node.type === type ? Option.some(node) : Option.none();

/**
 * Match a node by checking if its data is an instance of the given schema.
 */
export const whenType =
  <T extends Type.Entity.Any>(type: T): NodeMatcher<Entity.Entity<Schema.Schema.Type<T>>> =>
  (node: Node.Node): Option.Option<Entity.Entity<Schema.Schema.Type<T>>> =>
    Obj.instanceOf(type, node.data) ? Option.some(node.data) : Option.none();

/**
 * Match a node if its data is an object.
 */
export const whenObject = (node: Node.Node): Option.Option<Obj.Any> =>
  Obj.isObject(node.data) ? Option.some(node.data) : Option.none();

/**
 * Compose multiple matchers with AND logic - all must match.
 */
export const whenAll =
  (...matchers: NodeMatcher[]): NodeMatcher =>
  (node: Node.Node): Option.Option<Node.Node> => {
    for (const matcher of matchers) {
      const result = matcher(node);
      if (Option.isNone(result)) {
        return Option.none();
      }
    }
    return Option.some(node);
  };

/**
 * Compose multiple matchers with OR logic - at least one must match.
 */
export const whenAny =
  (...matchers: NodeMatcher[]): NodeMatcher =>
  (node: Node.Node): Option.Option<Node.Node> => {
    for (const matcher of matchers) {
      const result = matcher(node);
      if (Option.isSome(result)) {
        return Option.some(node);
      }
    }
    return Option.none();
  };
