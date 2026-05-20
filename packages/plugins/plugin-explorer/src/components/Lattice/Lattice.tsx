//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { type SpaceGraphNode } from '@dxos/schema';
import { getHashStyles, mx } from '@dxos/ui-theme';

import { type TreeNode } from '../Tree/types';

export type LatticeProps = {
  /** Object nodes from the space graph (typically `model.graph.nodes` filtered to `type === 'object'`). */
  nodes: SpaceGraphNode[];
  /** Mirrors the hover preview contract used by the other variants. */
  onNodeHover?: (node: TreeNode<Obj.Unknown> | null, event?: MouseEvent) => void;
};

type LatticeCell = {
  id: string;
  label: string;
  typename: string;
  object: Obj.Unknown;
};

/**
 * Renders objects in a square-as-possible lattice (CSS grid).
 * Cells are sorted by typename then by label so objects of the same type cluster together.
 */
export const Lattice = ({ nodes, onNodeHover }: LatticeProps) => {
  const cells = useMemo<LatticeCell[]>(() => {
    return nodes
      .map((node): LatticeCell | undefined => {
        const object = node.data?.object;
        if (!object) {
          return undefined;
        }
        const label = node.data?.label ?? Obj.getLabel(object) ?? node.id;
        const typename = Obj.getTypename(object) ?? '(untyped)';
        return { id: node.id, label, typename, object };
      })
      .filter((cell): cell is LatticeCell => cell !== undefined)
      .sort((a, b) => a.typename.localeCompare(b.typename) || a.label.localeCompare(b.label));
  }, [nodes]);

  // Columns ≈ √N so the grid stays as square as possible; rows fall out naturally.
  const columns = Math.max(1, Math.ceil(Math.sqrt(cells.length)));

  return (
    <div className='grow overflow-auto p-2'>
      <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {cells.map((cell) => (
          <LatticeItem key={cell.id} cell={cell} onNodeHover={onNodeHover} />
        ))}
      </div>
    </div>
  );
};

type LatticeItemProps = {
  cell: LatticeCell;
  onNodeHover?: LatticeProps['onNodeHover'];
};

const LatticeItem = ({ cell, onNodeHover }: LatticeItemProps) => {
  const styles = useMemo(() => getHashStyles(cell.typename), [cell.typename]);

  const handleEnter = (event: React.MouseEvent) => {
    onNodeHover?.({ id: cell.id, label: cell.label, data: cell.object }, event.nativeEvent);
  };
  const handleLeave = () => {
    onNodeHover?.(null);
  };

  return (
    <div
      role='button'
      tabIndex={0}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={mx(
        'aspect-square flex flex-col justify-between p-2 rounded border cursor-pointer overflow-hidden',
        styles.surface,
        styles.border,
        styles.foreground,
      )}
      title={`${cell.label}\n${cell.typename}`}
    >
      <div className='text-xs truncate font-medium'>{cell.label}</div>
      <div className={mx('text-[10px] truncate', styles.text)}>{shortTypename(cell.typename)}</div>
    </div>
  );
};

const shortTypename = (typename: string): string => {
  const last = typename.split('.').pop() ?? typename;
  return last.charAt(0).toUpperCase() + last.slice(1);
};
