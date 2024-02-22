//
// Copyright 2023 DXOS.org
//

// import * as S from '@effect/schema/Schema';

// const NodeBase = ({
//   data = S.any,
//   properties = S.struct({}),
// }: {
//   data: S.Schema<unknown, unknown, unknown>;
//   properties: S.Schema<unknown, unknown, unknown>;
// }) =>
//   S.struct({
//     id: S.string,
//     properties,
//     data,
//   });

/**
 * Represents a node in the graph.
 */
export type NodeBase<TData = any, TProperties extends Record<string, any> = Record<string, any>> = {
  /**
   * Globally unique ID.
   */
  id: string;

  /**
   * Properties of the node relevant to displaying the node.
   */
  properties: TProperties;

  /**
   * Data the node represents.
   */
  // TODO(burdon): Type system (e.g., minimally provide identifier string vs. TypedObject vs. Graph mixin type system)?
  //  type field would prevent convoluted sniffing of object properties. And allow direct pass-through for ECHO TypedObjects.
  data: TData;
};

export const isGraphNode = (data: unknown): data is Node =>
  data && typeof data === 'object' && 'id' in data && 'properties' in data && data.properties
    ? typeof data.properties === 'object' && 'data' in data
    : false;
