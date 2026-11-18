//
// Copyright 2026 DXOS.org
//

//
// The grid diagram: `diagram kind=grid` read as a hierarchy of grids. Nothing is searched for — the frame divides
// by the diagram's tracks, every group is a grid in the cell it was given, and each member takes the next cell in
// source order. So this places nothing itself: it lowers the intent to the grid boxes `@dxos/scene` already
// solves wherever the drawing is rendered, which keeps the rule, not its result, as what is stored.
//

import { Shape, solveGrids } from '@dxos/scene';

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

/** The labelled group {@link infer} reads inside a heading's grid that is also padded or framed. */
export const innerId = (group: string): string => `${group}-inner`;

export type Solution = { commands: Scene.Command[]; issues: Semantic.Issue[] };

/** A box a grid places: it states no geometry, since its frame is the rule's result. */
const placed = { x: 0, y: 0, w: 0, h: 0 } as const;

/** How a heading is drawn; a box drawn this way over a grid is what a labelled group lowers to. */
const HEADING_STYLE = {
  fill: 'none',
  border: false,
  align: 'center',
  valign: 'middle',
  fontSize: HEADING.fontSize,
} as const;

const BOX_KINDS: readonly string[] = Shape.BoxKind.literals;
const isBox = (element: Shape.Element): element is Shape.Box => BOX_KINDS.includes(element.kind);

const isHeading = (box: Shape.Box): boolean =>
  box.kind === 'rect' &&
  box.text !== undefined &&
  box.type === undefined &&
  box.fill === HEADING_STYLE.fill &&
  box.border === HEADING_STYLE.border &&
  box.align === HEADING_STYLE.align &&
  box.valign === HEADING_STYLE.valign &&
  box.fontSize === HEADING_STYLE.fontSize;

/** Whether a box shows anything. A grid shows only a frame; a plain box with no text, fill or border holds a cell. */
const draws = (box: Shape.Box): boolean =>
  box.kind === 'grid'
    ? box.border === true || (box.fill !== undefined && box.fill !== 'none')
    : box.text !== undefined || box.type !== undefined || box.border !== false || box.fill !== 'none';

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
        ...present({
          type: node.type,
          data: node.data,
          color: node.color,
          fill: node.fill,
          stroke: node.stroke,
          border: node.border,
          width: node.width,
          height: node.height,
        }),
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
      layout: group.layout,
      packSeed: group.packSeed,
      packMin: group.packMin,
      packMax: group.packMax,
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
          ...HEADING_STYLE,
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

/**
 * What an object shows, apart from how it is said: every box that draws, in the frame its grids give it, every
 * frame a grid draws, and every connector with the frames it joins. Two objects that agree here draw the same
 * picture, whatever their grids are called and however many of them there are.
 */
export const drawn = (object: Scene.WorldObject) => {
  const origin = object.origin ?? { x: 0, y: 0 };
  const boxes = object.elements.filter(isBox);
  const solved = solveGrids(boxes);
  const frameOf = (ref: string | undefined) => {
    // An end names a box, perhaps with a place on it (`frame/nav`, `box#left`); the frame is the box's.
    const frame = ref === undefined ? undefined : solved.get(ref.split(/[/#]/)[0]);
    return frame && { ...frame, x: frame.x + origin.x, y: frame.y + origin.y };
  };
  const leaves = boxes
    .filter((box) => box.kind !== 'grid' && draws(box))
    .map(({ id, x: _x, y: _y, w: _w, h: _h, parent: _parent, ...rest }) => ({
      // A heading's id is the document's own convention, so it is known by what it says.
      key: isHeading({ id, ...placed, ...rest }) ? `heading:${rest.text}` : id,
      ...rest,
      frame: frameOf(id),
    }))
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  const frames = boxes
    .filter((box) => box.kind === 'grid' && draws(box))
    .map(({ id, color, fill, stroke, weight, border }) => ({
      frame: frameOf(id),
      color,
      fill,
      stroke,
      weight,
      border,
    }));
  const arrows = object.elements
    .flatMap((element) => (element.kind === 'arrow' ? [element] : []))
    .map(({ id: _id, ...rest }) => ({ ...rest, fromFrame: frameOf(rest.from), toFrame: frameOf(rest.to) }));
  const others = object.elements.filter((element) => !isBox(element) && element.kind !== 'arrow').length;
  return { scale: object.scale ?? 1, leaves, frames, arrows, others };
};

export type Drawn = ReturnType<typeof drawn>;

const nowhere: Semantic.Range = { from: 0, to: 0 };

/** The rule and the frame a grid states, as a group states them. */
const groupFields = (grid: Shape.Box) =>
  present({
    cols: grid.cols,
    rows: grid.rows,
    gap: grid.gap,
    padding: grid.padding,
    autoCols: grid.autoCols,
    autoRows: grid.autoRows,
    justifyContent: grid.justifyContent,
    alignContent: grid.alignContent,
    layout: grid.layout,
    packSeed: grid.packSeed,
    packMin: grid.packMin,
    packMax: grid.packMax,
    color: grid.color,
    fill: grid.fill,
    stroke: grid.stroke,
    border: grid.border,
  });

/** A component's fields the text form spells; a list or a nested object has no spelling. */
const scalarsOf = (
  data: Readonly<Record<string, unknown>> | undefined,
): Record<string, Semantic.Scalar> | undefined => {
  const fields: Record<string, Semantic.Scalar> = {};
  for (const [name, value] of Object.entries(data ?? {})) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      fields[name] = value;
    }
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
};

/**
 * The grid diagram an object of grid boxes says: the inverse of {@link solve}. Each grid is a group, a grid that
 * holds a heading over a second grid is a labelled group, a box that draws nothing is an empty group, every other
 * box is a node and every arrow an edge. `undefined` when no single grid holds the drawing.
 *
 * A heading's grid that also states padding or a frame says two things, so it is read as two groups: one with
 * its id, padding and frame, around a labelled one named by {@link innerId}.
 *
 * This reads only what a grid diagram can say, so a drawing that holds more comes back as a diagram that draws
 * less. The caller compares {@link drawn} of both to know (see `Dsl.printIntent`).
 */
export const infer = (object: Scene.WorldObject): Semantic.Diagram | undefined => {
  const boxes = object.elements.filter(isBox);
  const ids = new Set(boxes.map(({ id }) => id));
  const roots = boxes.filter((box) => box.parent === undefined || !ids.has(box.parent));
  const [root] = roots;
  if (roots.length !== 1 || root.kind !== 'grid') {
    return undefined;
  }
  const childrenOf = (id: string): Shape.Box[] => boxes.filter((box) => box.parent === id);

  const diagram = Semantic.empty();
  const members = new Map<string, string[]>();
  diagram.kind = 'grid';
  diagram.members = members;
  diagram.size = { w: root.w, h: root.h };
  diagram.origin = { x: (object.origin?.x ?? 0) + root.x, y: (object.origin?.y ?? 0) + root.y };
  const { color: _color, fill: _fill, stroke: _stroke, border: _border, ...rule } = groupFields(root);
  if (Object.keys(rule).length > 0) {
    diagram.rule = rule;
  }

  const enlist = (owner: string, id: string): void => {
    members.set(owner, [...(members.get(owner) ?? []), id]);
  };
  const read = (box: Shape.Box, owner: string): void => {
    enlist(owner, box.id);
    const parent = owner === Semantic.ROOT ? {} : { parent: owner };
    if (box.kind !== 'grid') {
      if (!draws(box) && box.kind === 'rect') {
        diagram.groups.push({ id: box.id, label: box.id, relations: [], range: nowhere, ...parent });
        return;
      }
      diagram.nodes.push({
        id: box.id,
        label: box.text ?? box.id,
        relations: [],
        range: nowhere,
        ...(box.text !== undefined && (box.type !== undefined || box.text !== box.id) ? { labelled: true } : {}),
        ...(owner === Semantic.ROOT ? {} : { group: owner }),
        ...present({
          shape: box.kind === 'rect' ? undefined : box.kind,
          type: box.type,
          data: scalarsOf(box.data),
          color: box.color,
          fill: box.fill,
          stroke: box.stroke,
          border: box.border,
          width: box.width,
          height: box.height,
        }),
      });
      return;
    }
    const inner = childrenOf(box.id);
    const [heading, body] = inner;
    const { rows, gap, ...around } = groupFields(box);
    const labelled =
      inner.length === 2 &&
      rows === `${HEADING.height} 1fr` &&
      gap === HEADING.gap &&
      isHeading(heading) &&
      body.kind === 'grid';
    if (!labelled) {
      diagram.groups.push({ id: box.id, label: box.id, relations: [], range: nowhere, ...parent, ...groupFields(box) });
      inner.forEach((child) => read(child, box.id));
      return;
    }
    const label = heading.text ?? box.id;
    const framed = Object.keys(around).length > 0;
    const id = framed ? innerId(box.id) : box.id;
    if (framed) {
      diagram.groups.push({ id: box.id, label: box.id, relations: [], range: nowhere, ...parent, ...around });
      enlist(box.id, id);
    }
    diagram.groups.push({
      id,
      label,
      heading: label,
      relations: [],
      range: nowhere,
      ...(framed ? { parent: box.id } : parent),
      ...groupFields(body),
    });
    childrenOf(body.id).forEach((child) => read(child, id));
  };
  childrenOf(root.id).forEach((child) => read(child, Semantic.ROOT));

  const endOf = (ref: string): Semantic.End => {
    const [, node = ref, part = ''] = /^([^/#]+)(.*)$/.exec(ref) ?? [];
    return { node, range: nowhere, ...(part ? { part } : {}) };
  };
  for (const element of object.elements) {
    // An end at a point, not a box, has no spelling here; it is left out, which `drawn` then shows as a difference.
    if (element.kind !== 'arrow' || element.from === undefined || element.to === undefined) {
      continue;
    }
    diagram.edges.push({
      id: `${element.from}-${element.to}-${diagram.edges.length}`,
      from: endOf(element.from),
      to: endOf(element.to),
      via: [],
      range: nowhere,
      ...present({
        label: element.text,
        head: element.head,
        tail: element.tail,
        path: element.path,
        relation: element.relation,
        color: element.color,
        stroke: element.stroke,
      }),
    });
  }
  return diagram;
};
