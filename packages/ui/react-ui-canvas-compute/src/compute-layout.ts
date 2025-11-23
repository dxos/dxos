//
// Copyright 2024 DXOS.org
//

import { DefaultInput, DefaultOutput } from '@dxos/conductor';
import { JsonSchema } from '@dxos/echo';
import { type Anchor, ShapeLayout, type ShapeRegistry } from '@dxos/react-ui-canvas-editor';

import { type ComputeGraphController } from './graph';
import { type ComputeShape, createFunctionAnchors } from './shapes';

// TODO(burdon): Customize layout. Specialize ComputeShapeDef and registry.
export class ComputeShapeLayout extends ShapeLayout {
  constructor(
    private _controller: ComputeGraphController,
    registry: ShapeRegistry,
  ) {
    super(registry);
  }

  // TODO(burdon): Doesn't update.
  override getAnchors(shape: ComputeShape): Record<string, Anchor> {
    const shapeDef = this._registry.getShapeDef(shape.type);
    let anchors = shapeDef?.getAnchors?.(shape) ?? {};
    if (shape.node) {
      const node = this._controller.graph.getNode(shape.node);
      if (node.inputSchema || node.outputSchema) {
        // TODO(burdon): Requires that component defined input and output types.
        const inputSchema = node.inputSchema ? JsonSchema.toEffectSchema(node.inputSchema) : DefaultInput;
        const outputSchema = node.outputSchema ? JsonSchema.toEffectSchema(node.outputSchema) : DefaultOutput;
        anchors = createFunctionAnchors(shape, inputSchema, outputSchema);
      }
    }

    return anchors;
  }
}
