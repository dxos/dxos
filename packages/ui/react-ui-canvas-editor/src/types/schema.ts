//
// Copyright 2024 DXOS.org
//

import { ComputeGraph } from '@dxos/conductor';
import { Ref, S, TypedObject } from '@dxos/echo-schema';
import { BaseGraphEdge, BaseGraphNode, Graph } from '@dxos/graph';

// TODO(burdon): Consider interop with TLDraw and GeoJSON standards?

/**
 * Base type for all shapes.
 */
export const Shape = S.extend(
  BaseGraphNode.pipe(S.omit('type')),
  S.Struct({
    type: S.String,
    text: S.optional(S.String),
    guide: S.optional(S.Boolean),
    classNames: S.optional(S.String),
  }),
);

export type Shape = S.Schema.Type<typeof Shape>;

/**
 * Connections between shapes.
 */
export const Connection = S.extend(
  BaseGraphEdge,
  S.Struct({
    input: S.optional(S.String),
    output: S.optional(S.String),
  }),
);

export type Connection = S.Schema.Type<typeof Connection>;

// TODO(burdon): Rename scene?
export const Layout = S.Struct({
  shapes: S.mutable(S.Array(Shape)),
});

export type Layout = S.Schema.Type<typeof Layout>;

// TODO(wittjosiah): Rename ConductorType? WorkflowType?
// TODO(wittjosiah): Factor out?
export class CanvasBoardType extends TypedObject({
  typename: 'dxos.org/type/CanvasBoard',
  version: '0.1.0',
})({
  name: S.optional(S.String),

  computeGraph: S.optional(Ref(ComputeGraph)),

  /**
   * Graph of shapes positioned on the canvas.
   */
  layout: Graph,
}) {}
