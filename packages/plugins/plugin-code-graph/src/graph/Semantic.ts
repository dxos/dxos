//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Dsl, type Scene, SemanticEngine } from '@dxos/diagram';

import type * as Model from './Model.ts';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** One box and its cell pitch, shared with the canvas so semantic positions land on canvas boxes 1:1. */
export const BOX: Size = { width: 208, height: 64 };
export const PITCH: Size = { width: 272, height: 144 };

/** The engine keeps groups readable only when there are few of them (its skill text says three or fewer). */
const MAX_GROUPS = 6;

/** Predicates that read as "uses"; drawn as dashed dependency arrows. */
const DEPENDENCY = new Set(['imports', 'importsType', 'importsModule', 'usesPackage', 'declaresDep', 'reexports']);
/** Predicates that read as "contains"; drawn with a filled diamond at the whole. */
const CONTAINMENT = new Set(['declares', 'inPackage', 'hasMember']);

export type Diagram = {
  source: string;
  /** DSL id → node IRI; the DSL takes bare words, IRIs do not lex as one. */
  ids: Map<string, string>;
};

/** Writes the graph as illustrator DSL: one box per node, a frame per package when there are few, one edge per arrow. */
export const toDsl = (graph: Model.Patch, { flow = 'down' }: { flow?: 'down' | 'right' } = {}): Diagram => {
  const ids = new Map<string, string>();
  const dslId = new Map<string, string>();
  graph.nodes.forEach((node, index) => {
    ids.set(`n${index}`, node.id);
    dslId.set(node.id, `n${index}`);
  });

  const lines = [`diagram flow=${flow} box=${BOX.width}x${BOX.height} grid=${PITCH.width}x${PITCH.height}`];
  const nodeLine = (node: Model.Patch['nodes'][number], indent = '') =>
    `${indent}node ${dslId.get(node.id)} ${Dsl.formatString(node.label)} ref=${Dsl.formatString(node.id)}`;

  const groups = new Map<string, Model.Patch['nodes']>();
  for (const node of graph.nodes) {
    if (node.group) {
      groups.set(node.group, [...(groups.get(node.group) ?? []), node]);
    }
  }
  const framed = groups.size > 1 && groups.size <= MAX_GROUPS;
  if (framed) {
    [...groups.entries()].forEach(([name, members], index) => {
      lines.push(`group g${index} ${Dsl.formatString(name.split('/').pop() ?? name)} {`);
      members.forEach((node) => lines.push(nodeLine(node, '  ')));
      lines.push('}');
    });
  }
  for (const node of graph.nodes) {
    if (!framed || !node.group) {
      lines.push(nodeLine(node));
    }
  }

  for (const edge of graph.edges) {
    const from = dslId.get(edge.from);
    const to = dslId.get(edge.to);
    if (from && to && from !== to) {
      const word =
        edge.kind && DEPENDENCY.has(edge.kind)
          ? 'depends-on'
          : edge.kind && CONTAINMENT.has(edge.kind)
            ? 'composes'
            : '->';
      lines.push(`edge ${from} ${word} ${to}`);
    }
  }
  return { source: lines.join('\n'), ids };
};

export type Layout = {
  /** Box centres by node IRI, in canvas units. */
  positions: Record<string, Point>;
  /** The whole drawing (frames and routed arrows included), for `SceneSvg`. */
  objects: Scene.WorldObject[];
  /** Relations the engine had to relax, and problems with the source. */
  problems: string[];
};

/**
 * Lays the graph out with plugin-illustrator's semantic engine: one grid-search restart, which takes seconds rather
 * than the minutes the full search (with ELK seeds) can take, so it suits an interactive canvas.
 */
export const layout = (graph: Model.Patch, options?: { flow?: 'down' | 'right' }): Layout => {
  if (graph.nodes.length === 0) {
    return { positions: {}, objects: [], problems: [] };
  }
  const { source, ids } = toDsl(graph, options);
  const reading = Dsl.read(source);
  const solution = reading.diagram && SemanticEngine.solve(reading.diagram, { restarts: 1 });
  const { commands, problems } = Dsl.withLayout(reading, solution);
  const objects = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
  const positions: Record<string, Point> = {};
  for (const object of objects) {
    const iri = ids.get(object.id);
    const box = object.elements.find((element) => 'w' in element && 'h' in element);
    if (iri && box && 'w' in box) {
      const scale = object.scale ?? 1;
      const origin = object.origin ?? { x: 0, y: 0 };
      positions[iri] = {
        x: origin.x + (box.x + box.w / 2) * scale,
        y: origin.y + (box.y + box.h / 2) * scale,
      };
    }
  }
  return { positions, objects, problems: problems.map(({ message }) => message) };
};
