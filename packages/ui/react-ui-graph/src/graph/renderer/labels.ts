//
// Copyright 2026 DXOS.org
//

import { type D3Selection } from '../../util';
import { type GraphLayoutNode } from '../types';

export type LabelOptionsBase = {
  /**
   * Delay before fading the label in (ms). Default 0. Pair with the projector's tween
   * duration so labels appear after the layout settles.
   */
  delay?: number;
  /** Fade-in duration (ms). Default 200. */
  duration?: number;
  /** Radial offset from the node center (px). Default 4. */
  offset?: number;
  /** Additional CSS class(es) to set on the text element. */
  className?: string;
};

const DEFAULT_DURATION = 200;
const DEFAULT_OFFSET = 4;

/** Read the target (post-tween) position from a node. Falls back to current x/y on entry. */
const getTarget = (node: GraphLayoutNode): { x: number; y: number } => {
  const tx = (node as any).tx;
  const ty = (node as any).ty;
  return { x: tx ?? node.x ?? 0, y: ty ?? node.y ?? 0 };
};

/**
 * Append a radial leaf label outside the node ring, oriented outward toward the TARGET
 * position so the label rotates with the layout tween rather than the pre-tween position.
 * Used by cluster + bundle variants for typename-grouped leaves.
 */
export const appendRadialLeafLabel = (
  group: D3Selection<SVGGElement>,
  node: GraphLayoutNode,
  label: string,
  r: number,
  options: LabelOptionsBase = {},
): void => {
  if (!label) {
    return;
  }
  const { delay = 0, duration = DEFAULT_DURATION, offset = DEFAULT_OFFSET, className = 'dx-cluster-label' } = options;
  const { x: targetX, y: targetY } = getTarget(node);
  const angleDeg = (Math.atan2(targetY, targetX) * 180) / Math.PI;
  const flipped = angleDeg > 90 || angleDeg < -90;
  group
    .append('text')
    .attr('class', className)
    .attr('dy', '0.32em')
    .attr('transform', `rotate(${flipped ? angleDeg + 180 : angleDeg})`)
    .attr('x', flipped ? -(r + offset) : r + offset)
    .attr('text-anchor', flipped ? 'end' : 'start')
    .attr('opacity', 0)
    .style('cursor', 'pointer')
    .text(label)
    .transition()
    .delay(delay)
    .duration(duration)
    .attr('opacity', 1);
};

/**
 * Append a radial group label inside the node ring (anchored toward center), oriented along
 * the TARGET radial direction. Mirrors `appendRadialLeafLabel` but anchored on the opposite
 * side so leaf and group labels don't collide.
 */
export const appendRadialGroupLabel = (
  group: D3Selection<SVGGElement>,
  node: GraphLayoutNode,
  label: string,
  r: number,
  options: LabelOptionsBase = {},
): void => {
  if (!label) {
    return;
  }
  const {
    delay = 0,
    duration = DEFAULT_DURATION,
    offset = DEFAULT_OFFSET,
    className = 'dx-cluster-label dx-cluster-label-group',
  } = options;
  const { x: targetX, y: targetY } = getTarget(node);
  const angleDeg = (Math.atan2(targetY, targetX) * 180) / Math.PI;
  const flipped = angleDeg > 90 || angleDeg < -90;
  group
    .append('text')
    .attr('class', className)
    .attr('dy', '0.32em')
    .attr('transform', `rotate(${flipped ? angleDeg + 180 : angleDeg})`)
    .attr('x', flipped ? r + offset : -(r + offset))
    .attr('text-anchor', flipped ? 'start' : 'end')
    .attr('opacity', 0)
    .style('pointer-events', 'none')
    .text(label)
    .transition()
    .delay(delay)
    .duration(duration)
    .attr('opacity', 1);
};

/**
 * Append a centered root label above the node. Used by the cluster variant for the synthetic
 * root circle so the database / collection name reads from above the ring.
 */
export const appendRootLabel = (
  group: D3Selection<SVGGElement>,
  label: string,
  r: number,
  options: LabelOptionsBase = {},
): void => {
  if (!label) {
    return;
  }
  const {
    delay = 0,
    duration = DEFAULT_DURATION,
    offset = 6,
    className = 'dx-cluster-label dx-cluster-label-root',
  } = options;
  group
    .append('text')
    .attr('class', className)
    .attr('text-anchor', 'middle')
    .attr('y', -(r + offset))
    .attr('opacity', 0)
    .style('pointer-events', 'none')
    .text(label)
    .transition()
    .delay(delay)
    .duration(duration)
    .attr('opacity', 1);
};
