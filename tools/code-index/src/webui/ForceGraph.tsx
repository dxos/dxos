/** @jsxImportSource solid-js */
//
// Copyright 2026 DXOS.org
//

import {
  type SimulationLinkDatum,
  type SimulationNodeDatum,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';
import { For, Show, createMemo, createSignal } from 'solid-js';

/**
 * The exploration view of a `display.graph` presentation: a force layout where size and opacity
 * encode relevance, groups cluster and collapse on click, a node's card opens on click, and the
 * below-threshold nodes stay hidden until asked for. The layout is computed to rest in one pass
 * rather than animated, so the same graph always lands in the same place and nothing jitters while
 * someone is reading it.
 */

type InputNode = {
  id: string;
  label: string;
  group?: string;
  score?: number;
  kept?: boolean;
  card?: Record<string, unknown>;
};

type InputEdge = { from: string; to: string; kind?: string };

type Placed = SimulationNodeDatum & {
  id: string;
  label: string;
  group?: string;
  score: number;
  /** Members of a collapsed group, which this node stands for. */
  members?: number;
  card?: Record<string, unknown>;
};

const WIDTH = 720;
const HEIGHT = 520;

/** Reads what the snippet published; a malformed payload renders as an empty graph, not a crash. */
const parse = (content: string): { nodes: InputNode[]; edges: InputEdge[] } => {
  try {
    const value: unknown = JSON.parse(content);
    if (typeof value !== 'object' || value === null) {
      return { nodes: [], edges: [] };
    }
    const nodes = 'nodes' in value && Array.isArray(value.nodes) ? value.nodes : [];
    const edges = 'edges' in value && Array.isArray(value.edges) ? value.edges : [];
    return {
      nodes: nodes.flatMap((node: unknown) =>
        typeof node === 'object' && node !== null && 'id' in node && typeof node.id === 'string'
          ? [
              {
                id: node.id,
                label: 'label' in node && typeof node.label === 'string' ? node.label : node.id,
                group: 'group' in node && typeof node.group === 'string' ? node.group : undefined,
                // A model-authored score outside [0, 1] would draw a negative radius or break the layout.
                score:
                  'score' in node && typeof node.score === 'number' && Number.isFinite(node.score)
                    ? Math.min(1, Math.max(0, node.score))
                    : 1,
                kept: !('kept' in node) || node.kept !== false,
                card:
                  'card' in node && typeof node.card === 'object' && node.card !== null
                    ? Object.fromEntries(Object.entries(node.card))
                    : undefined,
              },
            ]
          : [],
      ),
      edges: edges.flatMap((edge: unknown) =>
        typeof edge === 'object' &&
        edge !== null &&
        'from' in edge &&
        'to' in edge &&
        typeof edge.from === 'string' &&
        typeof edge.to === 'string'
          ? [
              {
                from: edge.from,
                to: edge.to,
                kind: 'kind' in edge && typeof edge.kind === 'string' ? edge.kind : undefined,
              },
            ]
          : [],
      ),
    };
  } catch {
    return { nodes: [], edges: [] };
  }
};

/** A stable hue per group name, so a group keeps its colour across re-layouts. */
const hue = (group: string | undefined): number => {
  let hash = 0;
  for (const char of group ?? '') {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
};

const groupId = (group: string) => `group:${group}`;

export const ForceGraph = (props: { content: string }) => {
  const data = createMemo(() => parse(props.content));
  const [showAll, setShowAll] = createSignal(false);
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = createSignal<Placed>();

  const hidden = () => data().nodes.filter((node) => !node.kept).length;
  const groups = createMemo(() => {
    const counts = new Map<string, number>();
    for (const node of data().nodes) {
      if (node.group && (showAll() || node.kept)) {
        counts.set(node.group, (counts.get(node.group) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  });

  const toggle = (group: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });

  // Declared before `layout`: Solid runs a memo as soon as it is created, so a later `const` is still unbound.
  const radius = (node: Placed) => (node.members ? 10 + Math.sqrt(node.members) * 3 : 4 + 10 * node.score);

  const layout = createMemo(() => {
    const visible = data().nodes.filter((node) => showAll() || node.kept);
    const folded = collapsed();
    const nodes = new Map<string, Placed>();
    const owner = new Map<string, string>();
    for (const node of visible) {
      if (node.group && folded.has(node.group)) {
        const id = groupId(node.group);
        const existing = nodes.get(id);
        nodes.set(id, {
          id,
          label: node.group,
          group: node.group,
          score: Math.max(existing?.score ?? 0, node.score ?? 1),
          members: (existing?.members ?? 0) + 1,
        });
        owner.set(node.id, id);
      } else {
        nodes.set(node.id, {
          id: node.id,
          label: node.label,
          group: node.group,
          score: node.score ?? 1,
          card: node.card,
        });
        owner.set(node.id, node.id);
      }
    }
    const seen = new Set<string>();
    const links: (SimulationLinkDatum<Placed> & { kind?: string })[] = [];
    for (const edge of data().edges) {
      const source = owner.get(edge.from);
      const target = owner.get(edge.to);
      const key = `${source}\u0000${target}`;
      if (source && target && source !== target && !seen.has(key)) {
        seen.add(key);
        links.push({ source, target, kind: edge.kind });
      }
    }
    // Each group pulls towards its own point on a circle, which is what makes clusters read as clusters.
    const names = [...new Set([...nodes.values()].map((node) => node.group ?? ''))];
    const anchor = (group: string | undefined) => {
      const index = names.indexOf(group ?? '');
      const angle = (2 * Math.PI * index) / Math.max(1, names.length);
      const ring = names.length > 1 ? Math.min(WIDTH, HEIGHT) * 0.3 : 0;
      return { x: WIDTH / 2 + ring * Math.cos(angle), y: HEIGHT / 2 + ring * Math.sin(angle) };
    };
    const list = [...nodes.values()];
    const simulation = forceSimulation<Placed>(list)
      .force(
        'link',
        forceLink<Placed, SimulationLinkDatum<Placed>>(links)
          .id((node) => node.id)
          .distance(50)
          .strength(0.3),
      )
      .force('charge', forceManyBody<Placed>().strength(-120))
      .force(
        'collide',
        forceCollide<Placed>().radius((node) => radius(node) + 4),
      )
      .force('x', forceX<Placed>((node) => anchor(node.group).x).strength(0.08))
      .force('y', forceY<Placed>((node) => anchor(node.group).y).strength(0.08))
      .stop();
    simulation.tick(300);
    return { nodes: list, links };
  });

  const bounds = createMemo(() => {
    const { nodes } = layout();
    const xs = nodes.map((node) => node.x ?? 0);
    const ys = nodes.map((node) => node.y ?? 0);
    const pad = 40;
    return nodes.length
      ? `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`
      : `0 0 ${WIDTH} ${HEIGHT}`;
  });

  const position = (end: string | number | Placed | undefined) =>
    typeof end === 'object' ? { x: end.x ?? 0, y: end.y ?? 0 } : { x: 0, y: 0 };

  return (
    <div class='flex flex-col gap-2 p-2'>
      <div class='flex flex-wrap items-center gap-2 text-xs'>
        <For each={groups()}>
          {([group, count]) => (
            <button
              class='border-separator rounded border px-1.5 py-0.5'
              style={{ 'border-color': `hsl(${hue(group)} 55% 50%)`, 'opacity': collapsed().has(group) ? 0.6 : 1 }}
              title={collapsed().has(group) ? 'expand' : 'collapse'}
              onClick={() => toggle(group)}
            >
              {collapsed().has(group) ? '▸' : '▾'} {group} ({count})
            </button>
          )}
        </For>
        <Show when={hidden() > 0}>
          <button class='text-description hover:text-baseText ml-auto' onClick={() => setShowAll(!showAll())}>
            {showAll() ? 'hide low-relevance' : `show ${hidden()} low-relevance`}
          </button>
        </Show>
      </div>
      <svg viewBox={bounds()} class='text-description h-[28rem] w-full'>
        <defs>
          <marker id='force-head' viewBox='0 0 10 10' refX='10' refY='5' markerWidth='6' markerHeight='6' orient='auto'>
            <path d='M 0 0 L 10 5 L 0 10 z' fill='currentColor' />
          </marker>
        </defs>
        <For each={layout().links}>
          {(link) => {
            const from = position(link.source);
            const to = position(link.target);
            return (
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke='currentColor'
                stroke-opacity={0.45}
                stroke-dasharray={link.kind === 'relay' ? '3 3' : undefined}
                marker-end='url(#force-head)'
              />
            );
          }}
        </For>
        <For each={layout().nodes}>
          {(node) => (
            <g
              transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
              class='cursor-pointer'
              onClick={() => (node.members ? toggle(node.group ?? '') : setSelected(node))}
            >
              <circle
                r={radius(node)}
                fill={`hsl(${hue(node.group)} 55% 50%)`}
                fill-opacity={0.3 + 0.7 * node.score}
                stroke={selected()?.id === node.id ? 'currentColor' : 'none'}
              />
              <Show when={node.score >= 0.5 || node.members}>
                <text y={-radius(node) - 3} text-anchor='middle' fill='currentColor' class='text-baseText text-[10px]'>
                  {node.members ? `${node.label} ×${node.members}` : node.label}
                </text>
              </Show>
              <title>{`${node.label} — ${node.score.toFixed(2)}`}</title>
            </g>
          )}
        </For>
      </svg>
      <Show when={selected()}>
        {(node) => (
          <div class='border-separator rounded border p-2 text-xs'>
            <div class='mb-1 flex items-center justify-between'>
              <span class='font-medium'>{node().label}</span>
              <button class='text-description hover:text-baseText' onClick={() => setSelected(undefined)}>
                close
              </button>
            </div>
            <For each={Object.entries(node().card ?? {}).filter(([, value]) => value !== undefined && value !== '')}>
              {([key, value]) => (
                <div class='mt-1'>
                  <span class='text-description'>{key}: </span>
                  {key === 'snippet' ? (
                    <pre class='bg-baseSurface mt-1 overflow-x-auto rounded p-1'>{String(value)}</pre>
                  ) : (
                    <span>{String(value)}</span>
                  )}
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  );
};
