//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ComponentType, type FC } from 'react';

import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';
import { type NodeViewProps, UnknownNodeView } from '@dxos/react-ui-canvas/scene';

import { useComputeContext } from '../hooks/compute-context.ts';
import { useControllerUpdates } from '../hooks/useControllerUpdates.ts';
import { type ComputeShape } from '../shapes/index.ts';

/**
 * The shape component under the engine's view props: the node is the shape (it carries the same fields
 * plus `z`), re-rendered on every controller update since the runtime state it reads is not reactive.
 */
export const computeNodeView = <S extends ComputeShape>(
  schema: Schema.Codec<S, unknown, never, never>,
  Component: FC<ShapeComponentProps<S>>,
): ComponentType<NodeViewProps> => {
  const isShape = Schema.is(schema);
  const View = (props: NodeViewProps) => {
    const { node, selected } = props;
    const { controller } = useComputeContext();
    useControllerUpdates(controller);
    if (!isShape(node)) {
      return <UnknownNodeView {...props} />;
    }
    // The shape components were written against the editor's frame body, which is a full-size flex
    // container (`styles.frameContainer`); the engine's node frame is not, so their `grow` / `w-full`
    // centring collapsed to the top-left corner. The wrapper restores that contract for every shape.
    return (
      <div className='dx-fullscreen flex'>
        <Component shape={node} selected={selected} />
      </div>
    );
  };
  View.displayName = `ComputeNodeView(${Component.displayName ?? Component.name})`;
  return View;
};
