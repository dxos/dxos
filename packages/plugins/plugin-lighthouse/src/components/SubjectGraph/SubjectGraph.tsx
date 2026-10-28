//
// Copyright 2026 DXOS.org
//

import React, { type PointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import { type ThemedClassName } from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type GraphEdge, type SubjectGraph as SubjectGraphData } from '../../client/types.ts';
import { GraphNodeCard } from './GraphNodeCard.tsx';
import { type Layout as GraphLayout, clipEdge, layoutGraph } from './layout.ts';
import { FAMILIES, type Family, familyOf, splitCurie } from './model.ts';

/** Card sizes the layout places; the cards render at exactly these. */
const ROOT_SIZE = { width: 280, height: 168 };
const NODE_SIZE = { width: 208, height: 88 };

const ZOOM = { min: 0.08, max: 2.5 };

/** Each predicate family's stroke colour and dash. */
const FAMILY_STYLE: Record<Family, { stroke: string; dash?: string }> = {
  role: { stroke: 'stroke-amber-fg' },
  author: { stroke: 'stroke-sky-fg' },
  cite: { stroke: 'stroke-violet-fg', dash: '5 4' },
  same: { stroke: 'stroke-neutral-fg', dash: '2 3' },
  other: { stroke: 'stroke-emerald-fg' },
};

const FAMILY_SWATCH: Record<Family, string> = {
  role: 'bg-amber-fg',
  author: 'bg-sky-fg',
  cite: 'bg-violet-fg',
  same: 'bg-neutral-fg',
  other: 'bg-emerald-fg',
};

type View = { x: number; y: number; k: number };

const edgeId = (edge: GraphEdge) => `${edge.from} ${edge.predicate} ${edge.to}`;

/** The view that fits the whole layout (or, with `around`, one node and its neighbours) in a box. */
const fitView = (layout: GraphLayout, box: { width: number; height: number }, ids?: ReadonlySet<string>): View => {
  const placements = [...layout.placements.entries()]
    .filter(([id]) => !ids || ids.has(id))
    .map(([, placement]) => placement);
  if (placements.length === 0 || box.width === 0 || box.height === 0) {
    return { x: box.width / 2, y: box.height / 2, k: 1 };
  }
  const left = Math.min(...placements.map((placement) => placement.x - placement.width / 2));
  const right = Math.max(...placements.map((placement) => placement.x + placement.width / 2));
  const top = Math.min(...placements.map((placement) => placement.y - placement.height / 2));
  const bottom = Math.max(...placements.map((placement) => placement.y + placement.height / 2));
  const k = Math.max(ZOOM.min, Math.min(1.1, 0.92 * Math.min(box.width / (right - left), box.height / (bottom - top))));
  return { x: box.width / 2 - ((left + right) / 2) * k, y: box.height / 2 - ((top + bottom) / 2) * k, k };
};

export type SubjectGraphProps = ThemedClassName<{
  graph: SubjectGraphData;
  /** The selected node; it is outlined and its edges carry their predicates. */
  selectedId?: string;
  onSelect?: (iri: string) => void;
  /** A double-click: the host refocuses the graph on that node. */
  onFocus?: (iri: string) => void;
  /** "+N more" on a capped node: the host fetches its neighbours and merges them in. */
  onMore?: (iri: string) => void;
}>;

/**
 * A subject's graph, as lighthouse's web UI shows "everything about X": the roots and what is around them (people,
 * organisations, works, events), force-directed in rings by hops from the roots, each node a small card. Drag the
 * canvas to pan, scroll to zoom; hover or select a card and its edges carry their predicates.
 */
export const SubjectGraph = ({ graph, selectedId, onSelect, onFocus, onMore, classNames }: SubjectGraphProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [hovered, setHovered] = useState<string>();
  const drag = useRef<{ pointer: number; x: number; y: number; view: View; moved: boolean }>(undefined);

  const rootIds = useMemo(() => new Set(graph.roots), [graph.roots]);
  const layout = useMemo(() => layoutGraph(graph, { sizeOf: (_id, root) => (root ? ROOT_SIZE : NODE_SIZE) }), [graph]);

  // The box the canvas has; the first fit waits for it.
  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A new graph (or the first measured size) fits the roots and their neighbours: the first view stays readable.
  const fittedFor = useRef<GraphLayout>(undefined);
  useEffect(() => {
    if (box.width === 0 || fittedFor.current === layout) {
      return;
    }
    fittedFor.current = layout;
    const near = new Set(graph.roots);
    for (const edge of graph.edges) {
      if (rootIds.has(edge.from)) {
        near.add(edge.to);
      }
      if (rootIds.has(edge.to)) {
        near.add(edge.from);
      }
    }
    setView(fitView(layout, box, near));
  }, [layout, box, graph, rootIds]);

  const handleFit = useCallback(() => setView(fitView(layout, box)), [layout, box]);
  const zoomBy = useCallback(
    (factor: number, origin = { x: box.width / 2, y: box.height / 2 }) =>
      setView((view) => {
        const k = Math.max(ZOOM.min, Math.min(ZOOM.max, view.k * factor));
        return {
          k,
          x: origin.x - ((origin.x - view.x) * k) / view.k,
          y: origin.y - ((origin.y - view.y) * k) / view.k,
        };
      }),
    [box],
  );

  // Wheel zooms around the cursor; a non-passive listener, so the page does not scroll as well.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomBy(Math.exp(-event.deltaY * 0.0015), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [zoomBy]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, view, moved: false };
    },
    [view],
  );
  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) {
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < 4) {
      return;
    }
    if (!current.moved) {
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setView({ ...current.view, x: current.view.x + dx, y: current.view.y + dy });
  }, []);
  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) {
      // A drag that moved is a pan, not a click on the card under the pointer.
      if (drag.current.moved) {
        event.preventDefault();
      }
      drag.current = undefined;
    }
  }, []);

  const active = hovered ?? selectedId;
  const families = useMemo(() => {
    const present = new Set(graph.edges.map((edge) => familyOf(edge.predicate)));
    return FAMILIES.filter((family) => present.has(family));
  }, [graph.edges]);

  return (
    <div
      ref={viewportRef}
      role='application'
      aria-label={t('graph.label')}
      className={mx('relative dx-fill overflow-hidden touch-none select-none cursor-grab', classNames)}
      data-testid='lighthouse.graph'
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className='absolute left-0 top-0 origin-top-left'
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        <svg className='absolute left-0 top-0 overflow-visible pointer-events-none' width={1} height={1} aria-hidden>
          <defs>
            <marker
              id='lighthouse-graph-arrow'
              viewBox='0 0 10 10'
              refX='9'
              refY='5'
              markerWidth='7'
              markerHeight='7'
              orient='auto-start-reverse'
            >
              <path d='M0,0 L10,5 L0,10 z' fill='context-stroke' />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const from = layout.placements.get(edge.from);
            const to = layout.placements.get(edge.to);
            const segment = from && to ? clipEdge(from, to) : undefined;
            if (!segment) {
              return null;
            }
            const family = familyOf(edge.predicate);
            const style = FAMILY_STYLE[family];
            const hot = !!active && (edge.from === active || edge.to === active);
            const { prefix, name } = splitCurie(edge.predicate);
            return (
              <g
                key={edgeId(edge)}
                data-testid='lighthouse.graph.edge'
                data-predicate={edge.predicate}
                className={mx('transition-opacity', active && !hot && 'opacity-20')}
              >
                <line
                  {...segment}
                  className={style.stroke}
                  strokeWidth={hot ? 2.5 : family === 'cite' ? 1 : 1.5}
                  strokeDasharray={style.dash}
                  markerEnd='url(#lighthouse-graph-arrow)'
                />
                {hot && (
                  <text
                    x={(segment.x1 + segment.x2) / 2}
                    y={(segment.y1 + segment.y2) / 2}
                    textAnchor='middle'
                    dominantBaseline='middle'
                    className='text-xs stroke-base-surface'
                    strokeWidth={4}
                    paintOrder='stroke'
                  >
                    <tspan className='fill-fg-subtle'>{prefix}</tspan>
                    <tspan className='fill-fg'>{name}</tspan>
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {graph.nodes.map((node) => {
          const placement = layout.placements.get(node.id);
          if (!placement) {
            return null;
          }
          const root = rootIds.has(node.id);
          return (
            <div
              key={node.id}
              className='absolute cursor-pointer'
              style={{
                left: placement.x - placement.width / 2,
                top: placement.y - placement.height / 2,
                width: placement.width,
                height: placement.height,
              }}
              onPointerEnter={() => setHovered(node.id)}
              onPointerLeave={() => setHovered((current) => (current === node.id ? undefined : current))}
              onClick={(event) => {
                if (!event.defaultPrevented) {
                  onSelect?.(node.id);
                }
              }}
              onDoubleClick={(event) => {
                if (!event.defaultPrevented) {
                  onFocus?.(node.id);
                }
              }}
            >
              <GraphNodeCard
                node={node}
                root={root}
                selected={node.id === selectedId}
                more={graph.more[node.id]}
                onMore={onMore ? () => onMore(node.id) : undefined}
              />
            </div>
          );
        })}
      </div>

      <Layout.Flex gap='xs' classNames='absolute top-2 right-2 rounded-sm bg-base-surface/80'>
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--magnifying-glass-plus--regular'
          label={t('graph-zoom-in.label')}
          onClick={() => zoomBy(1.25)}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--magnifying-glass-minus--regular'
          label={t('graph-zoom-out.label')}
          onClick={() => zoomBy(0.8)}
        />
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--frame-corners--regular'
          label={t('graph-fit.label')}
          onClick={handleFit}
          data-testid='lighthouse.graph.fit'
        />
      </Layout.Flex>

      <Layout.Flex
        gap='sm'
        wrap
        align='center'
        classNames='absolute bottom-2 left-2 rounded-sm bg-base-surface/80 px-2 py-1 text-xs text-fg-muted'
      >
        <span className='tabular-nums'>
          {t('graph-counts.label', { nodes: graph.nodes.length, edges: graph.edges.length })}
        </span>
        {families.map((family) => (
          <Layout.Flex key={family} gap='xs' align='center'>
            <span className={mx('inline-block h-0.5 w-4', FAMILY_SWATCH[family])} />
            {t(`graph-family.${family}`)}
          </Layout.Flex>
        ))}
      </Layout.Flex>
    </div>
  );
};
