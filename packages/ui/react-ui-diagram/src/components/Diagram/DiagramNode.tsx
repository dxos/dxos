//
// Copyright 2026 DXOS.org
//

import { type Node as FlowNode, Handle, type NodeProps, Position } from '@xyflow/react';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { type Node, type Side } from '../../types';

const POSITION: Record<Side, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** Ports are placed as a fraction along their side so they hold position as the node resizes. */
const offsetStyle = (side: Side, offset: number) =>
  side === 'left' || side === 'right' ? { top: `${offset * 100}%` } : { left: `${offset * 100}%` };

export type DiagramNodeData = { node: Node };

export type DiagramNodeProps = NodeProps<FlowNode<DiagramNodeData>>;

/**
 * A constrained box: label plus optional compartments. Rendered as ordinary DOM so compartments and
 * theming come from the design system rather than a canvas shape API.
 */
export const DiagramNode = ({ data, selected }: DiagramNodeProps) => {
  const { node } = data;
  const compartments = node.compartments ?? [];

  return (
    <>
      <div
        className={mx(
          'flex flex-col w-full h-full overflow-hidden rounded-sm border bg-baseSurface',
          selected ? 'border-primary-500 ring-1 ring-primary-500' : 'border-separator',
        )}
      >
        <div
          className={mx(
            'flex items-center justify-center px-2 py-1 text-sm truncate',
            compartments.length > 0 && 'border-b border-separator font-medium',
          )}
        >
          {node.label ?? node.id}
        </div>
        {compartments.map((compartment) => (
          <div key={compartment.id} className='px-2 py-1 text-xs border-b border-separator last:border-b-0'>
            {compartment.label && <div className='text-description'>{compartment.label}</div>}
            {compartment.lines.map((line, index) => (
              <div key={index} className='truncate font-mono'>
                {line}
              </div>
            ))}
          </div>
        ))}
      </div>

      {(node.ports ?? []).flatMap((port) =>
        // A port both originates and terminates links, so each needs a source *and* a target
        // handle: React Flow resolves an edge's end by (id, type) and silently drops the edge
        // when no handle of the matching type exists. Legality is the ontology's job, not the
        // handle's.
        (['source', 'target'] as const).map((type) => (
          <Handle
            key={`${port.id}-${type}`}
            id={port.id}
            type={type}
            position={POSITION[port.side]}
            style={offsetStyle(port.side, port.offset)}
          />
        )),
      )}
    </>
  );
};

/** A group: a labelled container its children are positioned inside. */
export const DiagramGroup = ({ data, selected }: DiagramNodeProps) => {
  const { node } = data;

  return (
    <div
      className={mx(
        'w-full h-full rounded-sm border border-dashed',
        selected ? 'border-primary-500' : 'border-separator',
      )}
    >
      {node.label && <div className='px-2 py-1 text-xs text-description truncate'>{node.label}</div>}
    </div>
  );
};
