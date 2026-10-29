//
// Copyright 2026 DXOS.org
//

//
// Data-flow diagrams: processes transform data, stores hold it, external entities sit outside the
// system, and every edge is a flow of named data. Placement and routing are the semantic engine's;
// this module draws the three node roles and checks the rules that make a data-flow diagram valid.
//

import type * as Scene from './scene.ts';
import type * as Semantic from './semantic.ts';

/** Width of a store's id compartment, in scene units: room for `D99` inside the label inset. */
const COMPARTMENT = 48;

/** A data-flow node's role; a node that names none is a process. */
export const roleOf = (node: Semantic.Node): Semantic.Role => node.role ?? 'process';

/** Store ids in declaration order (`D1`, `D2`, ...), the numbering a data dictionary refers to. */
const storeIds = (diagram: Semantic.Diagram): Map<string, string> =>
  new Map(
    diagram.nodes.filter((node) => roleOf(node) === 'store').map((node, index) => [node.id, `D${index + 1}`] as const),
  );

/**
 * The elements of one data-flow node in a `w`×`h` box: a process is a bubble, an external entity a
 * shaded square box, a store a square box with its id in a compartment on the left. The first
 * element is always the `box` that carries the label.
 */
export const nodeElements = (
  diagram: Semantic.Diagram,
  node: Semantic.Node,
  { w, h }: Semantic.Size,
): Scene.Element[] => {
  const style = {
    ...(node.color ? { color: node.color } : {}),
    ...(node.stroke ? { stroke: node.stroke } : {}),
  };
  switch (roleOf(node)) {
    case 'external':
      return [
        {
          kind: 'rect',
          id: 'box',
          x: 0,
          y: 0,
          w,
          h,
          text: node.label,
          corners: 'none',
          fill: node.fill ?? 'solid',
          ...style,
        },
      ];
    case 'store':
      return [
        // Two boxes rather than one with a divider, so the label is fitted to the room it really has.
        {
          kind: 'rect',
          id: 'box',
          x: COMPARTMENT,
          y: 0,
          w: w - COMPARTMENT,
          h,
          text: node.label,
          corners: 'none',
          ...(node.fill ? { fill: node.fill } : {}),
          ...style,
        },
        {
          kind: 'rect',
          id: 'compartment',
          x: 0,
          y: 0,
          w: COMPARTMENT,
          h,
          text: storeIds(diagram).get(node.id) ?? 'D',
          weight: 's',
          corners: 'none',
          ...style,
        },
      ];
    default:
      return [
        {
          kind: 'ellipse',
          id: 'box',
          x: 0,
          y: 0,
          w,
          h,
          text: node.label,
          ...(node.fill ? { fill: node.fill } : {}),
          ...style,
        },
      ];
  }
};

/**
 * The data-flow rules, as warnings on the statement that breaks them: data moves only through a
 * process, a process both takes and gives data, and a store is read as well as written.
 */
export const check = (diagram: Semantic.Diagram): Semantic.Issue[] => {
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const role = (id: string): Semantic.Role => {
    const node = nodes.get(id);
    return node ? roleOf(node) : 'process';
  };
  const issues: Semantic.Issue[] = [];
  for (const edge of diagram.edges) {
    const [from, to] = [role(edge.from.node), role(edge.to.node)];
    if (from !== 'process' && to !== 'process') {
      issues.push({
        severity: 'warning',
        message: `Data flows from the ${from} "${edge.from.node}" to the ${to} "${edge.to.node}" without a process; route it through one.`,
        ...edge.range,
      });
    }
  }
  for (const node of diagram.nodes) {
    const inputs = diagram.edges.filter((edge) => edge.to.node === node.id).length;
    const outputs = diagram.edges.filter((edge) => edge.from.node === node.id).length;
    const kind = roleOf(node);
    const problem =
      kind === 'process' && inputs > 0 && outputs === 0
        ? 'takes data but gives none (a black hole)'
        : kind === 'process' && outputs > 0 && inputs === 0
          ? 'gives data but takes none (a miracle)'
          : kind === 'store' && inputs > 0 && outputs === 0
            ? 'is written but never read'
            : undefined;
    if (problem) {
      issues.push({ severity: 'warning', message: `The ${kind} "${node.id}" ${problem}.`, ...node.range });
    }
  }
  return issues;
};
