//
// Copyright 2026 DXOS.org
//

//
// The compute shapes as scene-engine node types: the schema is the shape's with the engine's `z`, the view
// renders the shape's component under the engine's view props, and the ports come from the shape.
//

import * as Schema from 'effect/Schema';
import React, { type ComponentType, type FC } from 'react';

import {
  type CreateProps,
  type Node,
  type NodeDef,
  type NodeViewProps,
  type Port,
  type Size,
  UnknownNodeView,
  nodeDef,
} from '@dxos/react-ui-canvas/scene';
import * as Icon from '@dxos/react-ui/Icon';

import { ComputeNodeDefContext, useComputeContext } from '../../hooks/compute-context.ts';
import { useControllerUpdates } from '../../hooks/useControllerUpdates.ts';
import { type ComputeShape } from '../defs.ts';

/** The engine's view props with the node narrowed to the shape. */
export type ComputeNodeViewProps<S extends ComputeShape> = Omit<NodeViewProps, 'node'> & { node: S };

export type ComputeNodeSpec<S extends ComputeShape> = Pick<
  NodeDef,
  'name' | 'icon' | 'group' | 'resizable' | 'openable'
> & {
  type: S['type'];
  /** The shape's schema with `z` (`withZ`), so the node is checked as the shape before its view or ports read it. */
  schema: Schema.Codec<S & { z: string }, unknown, never, never>;
  component: FC<ComputeNodeViewProps<S>>;
  /** The shape's factory; the engine's id, centre, size and z are applied over what it makes. */
  create: (props: Pick<ComputeShape, 'id' | 'center'>) => S;
  /** Defaults to the size the factory gives a new shape. */
  defaultSize?: Size;
  ports: (shape: S) => readonly Port[];
};

/** A compute shape's node definition. */
export const defineComputeNode = <S extends ComputeShape>({
  schema,
  component,
  create,
  defaultSize,
  ports,
  ...rest
}: ComputeNodeSpec<S>): NodeDef => {
  const isShape = Schema.is(schema);
  return {
    ...rest,
    schema,
    component: computeNodeView(isShape, component),
    create: ({ id, z, center, size }: CreateProps): Node => ({ ...create({ id, center }), z, size }),
    defaultSize: defaultSize ?? create({ id: 'default', center: { x: 0, y: 0 } }).size,
    ports: (node) => (isShape(node) ? ports(node) : []),
  };
};

/**
 * The shape's component under the engine's view props, re-rendered on every controller update since the
 * runtime state it reads is not reactive; a node that is not the shape renders as an unknown node.
 */
const computeNodeView = <S extends ComputeShape>(
  isShape: (node: Node) => node is Node & S & { z: string },
  Component: FC<ComputeNodeViewProps<S>>,
): ComponentType<NodeViewProps> => {
  const View = (props: NodeViewProps) => {
    const { node, registry } = props;
    const { controller } = useComputeContext();
    useControllerUpdates(controller);
    if (!isShape(node)) {
      return <UnknownNodeView {...props} />;
    }
    // A shape with no compute node behind it yet (the ghost of a create or palette drag) has no runtime state to
    // read, so it shows what it will be rather than mounting the live component.
    if (!node.node) {
      const def = nodeDef(registry, node);
      return (
        <div className='dx-cover flex flex-col items-center justify-center gap-1 text-fg-muted'>
          {def?.icon && <Icon.Icon icon={def.icon} size='lg' />}
          <span className='text-sm truncate'>{def?.name ?? node.type}</span>
        </div>
      );
    }

    // The components lay out as a full-size flex container (centring with `grow` / `w-full`); the engine's
    // node frame is not one, so the wrapper provides it.
    return (
      <ComputeNodeDefContext.Provider value={nodeDef(registry, node)}>
        <div className='dx-cover flex'>
          <Component {...props} node={node} />
        </div>
      </ComputeNodeDefContext.Provider>
    );
  };
  View.displayName = `ComputeNodeView(${Component.displayName ?? Component.name})`;
  return View;
};
