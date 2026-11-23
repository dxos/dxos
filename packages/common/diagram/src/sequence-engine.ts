//
// Copyright 2026 DXOS.org
//

//
// Lays out a sequence diagram: participants are columns in declaration order and the timeline is
// drawn top to bottom in source order, one row per message, note and fragment boundary. Nothing is
// searched: the order of statements is the layout, so the only choices are spacings, and those are
// computed from the labels so no text collides.
//
// Each participant is one object (its head and its lifeline). Everything on the timeline (messages,
// activation bars, notes, fragments) is one `edges` object, so a message drawn across another
// participant's activation bar reads as the decoration it is rather than a route through a node.
//

import { Shape } from '@dxos/scene';

import * as Diagnostics from './diagnostics.ts';
import * as Layout from './layout.ts';
import type * as Scene from './scene.ts';
import * as Semantic from './semantic.ts';
import * as SvgFile from './svg-file.ts';
import { GRID } from './uml-grid.ts';

const BOX_FONT = Layout.FONT_METRICS.m;
const TEXT_FONT = Layout.FONT_METRICS.s;
/** Head boxes are a fixed width across the diagram, so lifelines read as a regular grid. */
const MIN_HEAD_W = GRID * 3;
const MAX_HEAD_W = GRID * 6;
const HEAD_H = GRID * 2;
/** Clear space between two columns' head boxes. */
const COLUMN_GAP = GRID * 2;
/** Clear space either side of a message label, between it and the lifelines it spans. */
const LABEL_PAD = GRID / 2;
/** Width of an activation bar; a nested one is offset by half of it. */
const BAR_W = 12;
/** How far a message to self loops out from its lifeline. */
const LOOP_W = GRID * 1.5;
const NOTE_PAD = GRID / 4;
/** Inset of a fragment's frame around what it contains; nested frames inset further. */
const FRAME_PAD = GRID / 2;
/** Height of a fragment's operator tab, which is also its header row. */
const TAB_H = GRID;

const snapUp = (value: number) => Math.ceil(value / GRID) * GRID;
const textWidth = (text: string) => Math.max(0, ...text.split('\n').map((line) => line.length)) * TEXT_FONT.charW;
const textHeight = (text: string) => text.split('\n').length * TEXT_FONT.lineH;

export type Solution = {
  commands: Scene.Command[];
  issues: Semantic.Issue[];
  report: Diagnostics.Report;
};

type Extent = { left: number; right: number };
const EMPTY: Extent = { left: Infinity, right: -Infinity };
const union = (a: Extent, b: Extent): Extent => ({ left: Math.min(a.left, b.left), right: Math.max(a.right, b.right) });

/** An open activation: where it starts and how deep it sits on its lifeline. */
type Bar = { y: number; depth: number; caller: string };

/** Participants in column order: declaration order, with each group's members kept together. */
export const columnsOf = (diagram: Semantic.Diagram): Semantic.Node[] => {
  const columns: Semantic.Node[] = [];
  const placed = new Set<string>();
  for (const node of diagram.nodes) {
    if (placed.has(node.id)) {
      continue;
    }
    const members = node.group === undefined ? [node] : diagram.nodes.filter((entry) => entry.group === node.group);
    members.forEach((member) => placed.add(member.id));
    columns.push(...members);
  }
  return columns;
};

/** Every step of a timeline, fragments flattened, in source order. */
const flatten = (steps: readonly Semantic.Step[]): Semantic.Step[] =>
  steps.flatMap((step) =>
    step.kind === 'fragment' ? [step, ...step.fragment.sections.flatMap((section) => flatten(section.steps))] : [step],
  );

/**
 * Column centres, left to right: the head boxes' pitch, widened wherever a message label, a message
 * to self or a note needs more room between two lifelines.
 */
const placeColumns = (
  diagram: Semantic.Diagram,
  columns: readonly Semantic.Node[],
  headW: number,
  edges: ReadonlyMap<string, Semantic.Edge>,
): number[] => {
  const index = new Map(columns.map((node, position) => [node.id, position]));
  // Gaps between neighbours, widened by each constraint in turn; a span wider than one gap spreads
  // its deficit over the last gap it covers, which keeps the earlier columns where they were.
  const gaps = columns.slice(1).map((node, position) => {
    const boundary = node.group !== columns[position].group;
    return headW + COLUMN_GAP + (boundary ? GRID : 0);
  });
  const need = (from: number, to: number, width: number) => {
    // Room left of the first column or right of the last is open canvas, not a gap to widen.
    if (from < 0 || to <= from || to > gaps.length) {
      return;
    }
    const span = gaps.slice(from, to).reduce((total, gap) => total + gap, 0);
    if (span < width) {
      gaps[to - 1] += snapUp(width - span);
    }
  };
  const steps = flatten(diagram.timeline);
  const requests: { from: number; to: number; width: number }[] = [];
  for (const step of steps) {
    if (step.kind === 'message') {
      const edge = edges.get(step.edge);
      if (!edge) {
        continue;
      }
      const [from, to] = [index.get(edge.from.node) ?? 0, index.get(edge.to.node) ?? 0];
      const width = edge.label ? textWidth(edge.label) + LABEL_PAD * 2 + BAR_W : 0;
      if (from === to) {
        requests.push({ from, to: from + 1, width: LOOP_W + width + BAR_W * 2 });
      } else {
        requests.push({ from: Math.min(from, to), to: Math.max(from, to), width });
      }
    } else if (step.kind === 'note' && step.note.side !== 'over') {
      const [column] = step.note.over.map((id) => index.get(id) ?? 0);
      const width = textWidth(step.note.text) + NOTE_PAD * 2 + GRID;
      requests.push(
        step.note.side === 'right' ? { from: column, to: column + 1, width } : { from: column - 1, to: column, width },
      );
    }
  }
  // Narrow spans first, so a wide span only adds what its narrower neighbours did not already give it.
  requests.sort((left, right) => left.to - left.from - (right.to - right.from));
  requests.forEach(({ from, to, width }) => need(from, to, width));
  const centres = [0];
  gaps.forEach((gap) => centres.push(centres[centres.length - 1] + gap));
  return centres;
};

/**
 * Lays out a sequence diagram. Synchronous and deterministic: the same source always gives the same
 * scene, and every warning names the statement it belongs to.
 */
export const solve = (diagram: Semantic.Diagram): Solution => {
  const issues: Semantic.Issue[] = [];
  const columns = columnsOf(diagram);
  if (columns.length === 0) {
    return { commands: [], issues, report: Diagnostics.analyze([]) };
  }
  const edges = new Map(diagram.edges.map((edge) => [edge.id, edge]));
  const longest = Math.max(0, ...columns.map((node) => node.label.length));
  const headW = snapUp(Math.min(MAX_HEAD_W, Math.max(MIN_HEAD_W, longest * BOX_FONT.charW + GRID)));
  const headH = snapUp(
    Math.max(HEAD_H, Math.ceil((longest * BOX_FONT.charW) / (headW - GRID)) * BOX_FONT.lineH + GRID / 2),
  );
  const centres = placeColumns(diagram, columns, headW, edges);
  const xOf = new Map(columns.map((node, position) => [node.id, centres[position]]));
  const hasGroups = columns.some((node) => node.group !== undefined);
  const top = hasGroups ? GRID : 0;

  // The timeline, drawn into one list of elements while a cursor walks down the rows.
  const elements: Shape.Element[] = [];
  const stacks = new Map<string, Bar[]>(columns.map((node) => [node.id, []]));
  const closed: { node: string; bar: Bar; end: number }[] = [];
  /** Last row each participant took part in, so an activation nobody returns from still ends. */
  const lastSeen = new Map<string, number>();
  let cursor = top + headH + GRID;
  let barCount = 0;

  /** The x where a message meets a lifeline, on the side facing `toward`. */
  const portX = (node: string, toward: number) => {
    const x = xOf.get(node) ?? 0;
    const stack = stacks.get(node) ?? [];
    if (stack.length === 0) {
      return x;
    }
    const centre = x + ((stack.length - 1) * BAR_W) / 2;
    return toward >= centre ? centre + BAR_W / 2 : centre - BAR_W / 2;
  };

  const open = (node: string, y: number, caller: string) => {
    const stack = stacks.get(node);
    stack?.push({ y, depth: stack.length, caller });
  };

  const close = (node: string, y: number): boolean => {
    const bar = stacks.get(node)?.pop();
    if (bar) {
      closed.push({ node, bar, end: y });
    }
    return bar !== undefined;
  };

  const drawMessage = (edge: Semantic.Edge): Extent => {
    const [from, to] = [edge.from.node, edge.to.node];
    const style: SvgFile.ConnectorStyle =
      edge.message === 'return'
        ? { relation: 'dependency', ...(edge.color ? { color: edge.color } : {}) }
        : edge.message === 'send'
          ? { relation: 'dependency', stroke: 'solid', ...(edge.color ? { color: edge.color } : {}) }
          : {
              ...(edge.head ? { head: edge.head } : {}),
              ...(edge.stroke ? { stroke: edge.stroke } : {}),
              ...(edge.color ? { color: edge.color } : {}),
            };
    const labelH = edge.label ? TEXT_FONT.lineH : 0;
    // A message to self carries its label beside the loop, so it needs no label row above it.
    const y = cursor + (edge.label && from !== to ? GRID : GRID / 2);
    let extent: Extent;
    if (from === to) {
      const startX = portX(from, Infinity);
      const back = y + GRID;
      if (edge.message === 'call') {
        open(to, back, from);
      }
      const endX = portX(to, Infinity);
      const out = Math.max(startX, endX) + LOOP_W;
      elements.push(
        ...SvgFile.connectorElements(
          edge.id,
          [
            { x: startX, y },
            { x: out, y },
            { x: out, y: back },
            { x: endX, y: back },
          ],
          style,
        ),
      );
      if (edge.label) {
        elements.push({
          kind: 'text',
          id: `${edge.id}-label`,
          x: out + LABEL_PAD / 2,
          y: y - labelH / 2 + GRID / 2,
          text: edge.label,
        });
      }
      extent = { left: startX, right: out + (edge.label ? textWidth(edge.label) + LABEL_PAD : 0) };
      cursor = back + GRID / 2;
    } else {
      const [fromX, toX] = [xOf.get(from) ?? 0, xOf.get(to) ?? 0];
      const startX = portX(from, toX);
      if (edge.message === 'call') {
        open(to, y, from);
      }
      const endX = portX(to, fromX);
      if (edge.message === 'return') {
        const bar = stacks.get(from)?.at(-1);
        if (!bar) {
          issues.push({
            severity: 'warning',
            message: `"${from}" returns to "${to}" with no open call to return from.`,
            ...edge.range,
          });
        } else if (bar.caller !== to) {
          issues.push({
            severity: 'warning',
            message: `"${from}" returns to "${to}", but its innermost call came from "${bar.caller}".`,
            ...edge.range,
          });
        }
      }
      elements.push(
        ...SvgFile.connectorElements(
          edge.id,
          [
            { x: startX, y },
            { x: endX, y },
          ],
          style,
        ),
      );
      if (edge.label) {
        const width = textWidth(edge.label);
        elements.push({
          kind: 'text',
          id: `${edge.id}-label`,
          x: (startX + endX) / 2 - width / 2,
          y: y - labelH - 4,
          text: edge.label,
        });
      }
      extent = { left: Math.min(startX, endX), right: Math.max(startX, endX) };
      cursor = y + GRID / 2;
    }
    if (edge.message === 'return') {
      close(from, y);
    }
    lastSeen.set(from, y);
    lastSeen.set(to, y);
    return extent;
  };

  const drawNote = (note: Semantic.Note): Extent => {
    const xs = note.over.map((id) => xOf.get(id) ?? 0);
    const width = snapUp(textWidth(note.text) + NOTE_PAD * 4);
    const h = snapUp(textHeight(note.text) + NOTE_PAD * 2);
    const y = cursor + GRID / 4;
    const [left, right] =
      note.side === 'over'
        ? (() => {
            const [low, high] = [Math.min(...xs) - GRID, Math.max(...xs) + GRID];
            const grow = Math.max(0, width - (high - low)) / 2;
            return [low - grow, high + grow];
          })()
        : note.side === 'right'
          ? [xs[0] + GRID / 2, xs[0] + GRID / 2 + width]
          : [xs[0] - GRID / 2 - width, xs[0] - GRID / 2];
    elements.push({
      kind: 'rect',
      id: note.id,
      x: left,
      y,
      w: right - left,
      h,
      text: note.text,
      weight: 's',
      corners: 'none',
      fill: 'tint',
      color: note.color ?? 'yellow',
    });
    cursor = y + h + GRID / 4;
    return { left, right };
  };

  /** Operator tab, guards and dividers drawn once the frame's width is known. */
  const drawFragment = (fragment: Semantic.Fragment): Extent => {
    const frameTop = cursor;
    cursor += TAB_H + GRID / 4;
    let content = EMPTY;
    const dividers: number[] = [];
    fragment.sections.forEach((section, position) => {
      if (position > 0) {
        dividers.push(cursor);
        cursor += GRID;
      }
      const opened = new Map([...stacks].map(([node, stack]) => [node, stack.length]));
      content = union(content, drawSteps(section.steps));
      // An activation opened under a guard and never returned from ends with its section, not past the divider.
      for (const [node, depth] of opened) {
        while ((stacks.get(node)?.length ?? 0) > depth) {
          close(node, cursor);
        }
      }
      cursor += GRID / 4;
    });
    const bottom = cursor + GRID / 4;
    cursor = bottom + GRID / 4;
    const tabW = snapUp(fragment.kind.length * TEXT_FONT.charW + GRID);
    const firstGuard = fragment.sections[0]?.guard;
    const guardW = firstGuard ? textWidth(`[${firstGuard}]`) + LABEL_PAD : 0;
    const otherGuards = fragment.sections
      .slice(1)
      .map((section) => (section.guard ? textWidth(`[${section.guard}]`) : 0));
    const left = (Number.isFinite(content.left) ? content.left : 0) - FRAME_PAD - GRID / 2;
    const right = Math.max(
      (Number.isFinite(content.right) ? content.right : 0) + FRAME_PAD + GRID / 2,
      left + tabW + guardW + GRID / 2,
      ...otherGuards.map((width) => left + tabW + width + GRID),
    );
    elements.push(
      { kind: 'rect', id: fragment.id, x: left, y: frameTop, w: right - left, h: bottom - frameTop, corners: 'none' },
      {
        kind: 'rect',
        id: `${fragment.id}-tab`,
        x: left,
        y: frameTop,
        w: tabW,
        h: TAB_H,
        text: fragment.kind,
        weight: 's',
        corners: 'bottom',
        fill: 'solid',
      },
      ...(firstGuard
        ? [
            {
              kind: 'text' as const,
              id: `${fragment.id}-guard-0`,
              x: left + tabW + LABEL_PAD / 2,
              y: frameTop + (TAB_H - TEXT_FONT.lineH) / 2,
              text: `[${firstGuard}]`,
              color: 'grey' as const,
            },
          ]
        : []),
    );
    dividers.forEach((y, position) => {
      const guard = fragment.sections[position + 1]?.guard;
      elements.push({
        kind: 'line',
        id: `${fragment.id}-else-${position + 1}`,
        points: [
          { x: left, y },
          { x: right, y },
        ],
        stroke: 'dashed',
        guide: true,
      });
      if (guard) {
        elements.push({
          kind: 'text',
          id: `${fragment.id}-guard-${position + 1}`,
          // Under the first guard, past the tab, which keeps it off the lifeline nearest the frame's edge.
          x: left + tabW + LABEL_PAD / 2,
          y: y + (GRID - TEXT_FONT.lineH) / 2,
          text: `[${guard}]`,
          color: 'grey',
        });
      }
    });
    return { left, right };
  };

  const drawSteps = (steps: readonly Semantic.Step[]): Extent =>
    steps.reduce((extent, step) => {
      switch (step.kind) {
        case 'message': {
          const edge = edges.get(step.edge);
          return edge ? union(extent, drawMessage(edge)) : extent;
        }
        case 'note':
          return union(extent, drawNote(step.note));
        case 'fragment':
          return union(extent, drawFragment(step.fragment));
      }
    }, EMPTY);

  drawSteps(diagram.timeline);
  const end = cursor + GRID / 2;

  // An activation nobody returned from ends just after the last message its participant took part in.
  for (const [node, stack] of stacks) {
    while (stack.length > 0) {
      const bar = stack[stack.length - 1];
      close(node, Math.max(bar.y + GRID / 2, (lastSeen.get(node) ?? bar.y) + GRID / 2));
    }
  }
  // Bars paint before the messages that meet them, deepest last so a nested bar sits on top.
  const bars: Shape.Element[] = closed
    .sort((left, right) => left.bar.depth - right.bar.depth)
    .map(({ node, bar, end: barEnd }) => ({
      kind: 'rect',
      id: `activation-${barCount++}`,
      x: (xOf.get(node) ?? 0) + (bar.depth * BAR_W) / 2 - BAR_W / 2,
      y: bar.y,
      w: BAR_W,
      h: Math.max(GRID / 2, barEnd - bar.y),
      corners: 'none',
      fill: 'solid',
    }));

  // Translate so the drawing's left edge sits at the origin.
  const lefts = [
    ...centres.map((centre) => centre - headW / 2),
    ...elements.flatMap((element) =>
      element.kind === 'rect' || element.kind === 'text'
        ? [element.x]
        : element.kind === 'line'
          ? element.points.map((point) => point.x)
          : [],
    ),
  ];
  const minX = Math.min(...lefts) - (hasGroups ? GRID / 2 : 0);
  const dx = diagram.origin.x - minX;
  const dy = diagram.origin.y;

  const commands: Scene.Command[] = [];
  // Group frames first, so they paint under the heads they enclose.
  const groupIds = [...new Set(columns.flatMap((node) => (node.group === undefined ? [] : [node.group])))];
  for (const groupId of groupIds) {
    const group = diagram.groups.find((entry) => entry.id === groupId);
    const members = columns.filter((node) => node.group === groupId).map((node) => xOf.get(node.id) ?? 0);
    const [left, right] = [Math.min(...members) - headW / 2 - GRID / 2, Math.max(...members) + headW / 2 + GRID / 2];
    const [w, h] = [right - left, end + GRID / 2];
    commands.push({
      op: 'upsert-object',
      object: {
        id: groupId,
        origin: { x: left + dx, y: dy },
        scale: 1,
        elements: [
          {
            kind: 'line',
            id: 'frame',
            points: [
              { x: 0, y: 0 },
              { x: w, y: 0 },
              { x: w, y: h },
              { x: 0, y: h },
              { x: 0, y: 0 },
            ],
            stroke: 'dashed',
            guide: true,
            ...(group?.color ? { color: group.color } : {}),
          },
          ...(group?.label.trim()
            ? [
                {
                  kind: 'text' as const,
                  id: 'label',
                  x: GRID / 4,
                  y: (GRID - TEXT_FONT.lineH) / 2,
                  text: group.label,
                  color: 'grey' as const,
                },
              ]
            : []),
        ],
      },
    });
  }
  for (const node of columns) {
    const x = (xOf.get(node.id) ?? 0) - headW / 2;
    const lifeline: Shape.Polyline = {
      kind: 'line',
      id: 'lifeline',
      points: [
        { x: headW / 2, y: headH },
        { x: headW / 2, y: end - top },
      ],
      stroke: 'dashed',
      guide: true,
      color: 'grey',
    };
    const head: Shape.Element[] =
      node.role === 'actor'
        ? actor(node, headW, headH)
        : [
            {
              kind: node.shape ?? 'rect',
              id: 'box',
              x: 0,
              y: 0,
              w: headW,
              h: headH,
              text: node.label,
              ...(node.color ? { color: node.color } : {}),
              ...(node.fill ? { fill: node.fill } : {}),
              ...(node.stroke ? { stroke: node.stroke } : {}),
            },
          ];
    commands.push({
      op: 'upsert-object',
      object: {
        id: node.id,
        origin: { x: x + dx, y: top + dy },
        scale: 1,
        ...(node.ref ? { ref: node.ref } : {}),
        elements: [lifeline, ...head],
      },
    });
  }
  commands.push({
    op: 'upsert-object',
    object: {
      id: Semantic.CONNECTORS,
      origin: { x: dx, y: dy },
      scale: 1,
      elements: [...bars, ...elements],
    },
  });
  const objects = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
  return { commands, issues, report: Diagnostics.analyze(objects) };
};

/** A stick figure with its name under it, in the head's box, so its lifeline starts where a box's would. */
const actor = (node: Semantic.Node, w: number, h: number): Shape.Element[] => {
  const cx = w / 2;
  const figureH = h - TEXT_FONT.lineH - 4;
  const head = figureH * 0.22;
  const neck = head * 2;
  const hip = figureH * 0.68;
  const color = node.color ? { color: node.color } : {};
  const limb = (id: string, points: Shape.Point[]): Shape.Polyline => ({
    kind: 'line',
    id,
    points,
    guide: true,
    ...color,
  });
  return [
    { kind: 'circle', id: 'head', cx, cy: head, r: head, ...color },
    limb('body', [
      { x: cx, y: neck },
      { x: cx, y: hip },
    ]),
    limb('arms', [
      { x: cx - head * 1.6, y: neck + head * 0.6 },
      { x: cx + head * 1.6, y: neck + head * 0.6 },
    ]),
    limb('legs', [
      { x: cx - head * 1.4, y: figureH },
      { x: cx, y: hip },
      { x: cx + head * 1.4, y: figureH },
    ]),
    {
      kind: 'text',
      id: 'label',
      x: cx - textWidth(node.label) / 2,
      y: figureH + 2,
      text: node.label,
      ...color,
    },
  ];
};
