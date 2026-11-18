//
// Copyright 2026 DXOS.org
//

//
// The grid diagram: `diagram kind=grid` read as a hierarchy of grids. Nothing is searched for — the frame divides
// by the diagram's tracks, every group is a grid in the cell it was given, and each member takes the next cell in
// source order. So this places nothing itself: it lowers the intent to the grid boxes `@dxos/scene` already
// solves wherever the drawing is rendered, which keeps the rule, not its result, as what is stored.
//

import { type Shape } from '@dxos/scene';

import type * as Scene from './scene.ts';
import * as Semantic from './semantic.ts';

/**
 * The id of the object holding the whole drawing, and of its outermost grid. `diagram` is a reserved word, so no
 * node or group written bare can take it.
 */
export const OBJECT = 'diagram';

/** A labelled group's heading: a row this tall over the group's members, this far above them. */
export const HEADING = { height: 48, gap: 16, fontSize: 34 } as const;

/** The ids a labelled group's heading and members' grid take, beside the group's own. */
export const headingId = (group: string): string => `${group}-heading`;
export const bodyId = (group: string): string => `${group}-body`;

export type Solution = { commands: Scene.Command[]; issues: Semantic.Issue[] };

/** A box a grid places: it states no geometry, since its frame is the rule's result. */
const placed = { x: 0, y: 0, w: 0, h: 0 } as const;

/** The fields of `fields` that are set, so an absent option never becomes an explicit `undefined`. */
const present = <T extends Record<string, unknown>>(fields: T): { [K in keyof T]?: Exclude<T[K], undefined> } => {
  const result: { [K in keyof T]?: Exclude<T[K], undefined> } = {};
  for (const key of Object.keys(fields)) {
    if (fields[key] !== undefined) {
      Object.assign(result, { [key]: fields[key] });
    }
  }
  return result;
};

/** What each container holds, in source order; a diagram built without the reader lists groups before nodes. */
const membersOf = (diagram: Semantic.Diagram): Map<string, string[]> => {
  if (diagram.members) {
    return diagram.members;
  }
  const members = new Map<string, string[]>();
  const enlist = (owner: string | undefined, id: string) => {
    const key = owner ?? Semantic.ROOT;
    members.set(key, [...(members.get(key) ?? []), id]);
  };
  diagram.groups.forEach((group) => enlist(group.parent, group.id));
  diagram.nodes.forEach((node) => enlist(node.group, node.id));
  return members;
};

/**
 * The diagram as one object of grid boxes, component boxes and arrows. A group with a label is a heading over its
 * members; one without is just its members' grid.
 */
export const solve = (diagram: Semantic.Diagram): Solution => {
  const issues: Semantic.Issue[] = [];
  if (!diagram.size) {
    issues.push({
      severity: 'error',
      message: 'A grid diagram needs a frame to divide: `diagram kind=grid size=1600x900`.',
      from: 0,
      to: 0,
    });
    return { commands: [], issues };
  }

  const members = membersOf(diagram);
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const groups = new Map(diagram.groups.map((group) => [group.id, group]));
  const elements: Shape.Element[] = [];
  const taken = new Map<string, Semantic.Range>();
  const claim = (id: string, range: Semantic.Range): void => {
    if (taken.has(id)) {
      issues.push({ severity: 'error', message: `"${id}" names two boxes; choose another id.`, ...range });
    }
    taken.set(id, range);
  };

  const emit = (id: string, parent: string): void => {
    const node = nodes.get(id);
    if (node) {
      claim(id, node.range);
      elements.push({
        kind: node.shape ?? 'rect',
        id,
        ...placed,
        // A component draws itself, so it shows no text it was not given; a plain box falls back to its id.
        ...present({ text: node.labelled || node.type === undefined ? node.label : undefined }),
        parent,
        ...present({ type: node.type, data: node.data, color: node.color, fill: node.fill, stroke: node.stroke }),
      });
      return;
    }
    const group = groups.get(id);
    if (!group) {
      return;
    }
    claim(id, group.range);
    // The rule and the frame are the members' grid's; a frame round the heading too is a group around this one.
    const rule = present({
      cols: group.cols,
      rows: group.rows,
      gap: group.gap,
      padding: group.padding,
      autoCols: group.autoCols,
      autoRows: group.autoRows,
      justifyContent: group.justifyContent,
      alignContent: group.alignContent,
      color: group.color,
      fill: group.fill,
      stroke: group.stroke,
      border: group.border,
    });
    const inner = group.heading === undefined ? id : bodyId(id);
    if (group.heading === undefined) {
      elements.push({ kind: 'grid', id, ...placed, ...rule, parent });
    } else {
      claim(headingId(id), group.range);
      claim(inner, group.range);
      elements.push(
        { kind: 'grid', id, ...placed, rows: `${HEADING.height} 1fr`, gap: HEADING.gap, parent },
        {
          kind: 'rect',
          id: headingId(id),
          ...placed,
          text: group.heading,
          parent: id,
          fill: 'none',
          border: false,
          align: 'center',
          valign: 'middle',
          fontSize: HEADING.fontSize,
        },
        { kind: 'grid', id: inner, ...placed, ...rule, parent: id },
      );
    }
    (members.get(id) ?? []).forEach((member) => emit(member, inner));
  };

  elements.push({ kind: 'grid', id: OBJECT, x: 0, y: 0, ...diagram.size, ...present({ ...diagram.rule }) });
  (members.get(Semantic.ROOT) ?? []).forEach((member) => emit(member, OBJECT));

  const refOf = (end: Semantic.End): string => `${end.node}${end.part ?? ''}`;
  for (const edge of diagram.edges) {
    elements.push({
      kind: 'arrow',
      id: edge.id,
      from: refOf(edge.from),
      to: refOf(edge.to),
      ...present({
        text: edge.label,
        head: edge.head,
        tail: edge.tail,
        path: edge.path,
        relation: edge.relation,
        color: edge.color,
        stroke: edge.stroke,
      }),
    });
  }

  return { commands: [{ op: 'upsert-object', object: { id: OBJECT, origin: diagram.origin, elements } }], issues };
};
