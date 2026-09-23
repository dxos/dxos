//
// Copyright 2026 DXOS.org
//

//
// Mermaid class-diagram dialect: parses the subset needed for UML class diagrams (class blocks
// with members, stereotypes, and the standard relation arrows) and compiles it to scene commands
// with a layered layout — supertypes above subtypes. Mermaid carries no coordinates, so the
// dialect owns placement; see `dialect.ts` for the contract.
//

import * as Layout from './layout.ts';
import type * as Scene from './scene.ts';

export type Direction = 'TB' | 'BT' | 'LR' | 'RL';

export type UmlClass = {
  id: string;
  label: string;
  /** e.g. "interface", "abstract", "enumeration". */
  stereotype?: string;
  attributes: string[];
  methods: string[];
};

export type RelationKind = 'inheritance' | 'realization' | 'composition' | 'aggregation' | 'association' | 'dependency';

/** Rendered arrow direction: subtype → supertype, whole → part, source → target. */
export type UmlRelation = {
  from: string;
  to: string;
  kind: RelationKind;
  label?: string;
  fromCardinality?: string;
  toCardinality?: string;
};

export type UmlModel = {
  direction: Direction;
  classes: UmlClass[];
  relations: UmlRelation[];
};

const DIRECTIONS: Direction[] = ['TB', 'BT', 'LR', 'RL'];

// `class Name`, `class Name["Label"]`, `class Name {`.
const CLASS = /^class\s+([A-Za-z0-9_~<>-]+)(?:\s*\[\s*"(.*?)"\s*\])?\s*(\{)?\s*$/;
// `Name : +member` inline member declaration.
const INLINE_MEMBER = /^([A-Za-z0-9_~<>-]+)\s*:\s*(.+)$/;
const STEREOTYPE = /^<<\s*(.*?)\s*>>$/;

/**
 * Relation arrows, normalized to (kind, whether the LEFT side is the arrow target).
 * `A <|-- B` reads "B inherits A": the parent is on the flat side of the triangle.
 */
const RELATIONS: [token: string, kind: RelationKind, leftIsTarget: boolean][] = [
  ['<|--', 'inheritance', true],
  ['--|>', 'inheritance', false],
  ['<|..', 'realization', true],
  ['..|>', 'realization', false],
  ['*--', 'composition', false],
  ['--*', 'composition', true],
  ['o--', 'aggregation', false],
  ['--o', 'aggregation', true],
  ['-->', 'association', false],
  ['<--', 'association', true],
  ['..>', 'dependency', false],
  ['<..', 'dependency', true],
  ['..', 'dependency', false],
  ['--', 'association', false],
];

// `A "1" <|-- "many" B : label` — cardinalities and the trailing label are optional.
const RELATION = new RegExp(
  '^([A-Za-z0-9_~<>-]+)\\s*(?:"([^"]*)"\\s*)?' +
    `(${RELATIONS.map(([token]) => token.replace(/[|*.>-]/g, '\\$&')).join('|')})` +
    '\\s*(?:"([^"]*)"\\s*)?([A-Za-z0-9_~<>-]+)\\s*(?::\\s*(.+))?$',
);

/** Mermaid generics use `~T~`; render them as `<T>`. */
const genericLabel = (id: string) => id.replace(/~([^~]*)~/g, '<$1>');

/** Parse a mermaid class diagram into a neutral model. Unrecognised lines are ignored. */
export const parse = (source: string): UmlModel => {
  const classes = new Map<string, UmlClass>();
  const relations: UmlRelation[] = [];
  let direction: Direction = 'TB';
  let open: UmlClass | undefined;

  const declare = (id: string): UmlClass => {
    let entry = classes.get(id);
    if (!entry) {
      entry = { id, label: genericLabel(id), attributes: [], methods: [] };
      classes.set(id, entry);
    }
    return entry;
  };

  const addMember = (entry: UmlClass, raw: string) => {
    const member = raw.trim();
    const stereotype = STEREOTYPE.exec(member);
    if (stereotype) {
      entry.stereotype = stereotype[1];
      return;
    }
    if (member) {
      // A parameter list marks a method; everything else is an attribute.
      (member.includes('(') ? entry.methods : entry.attributes).push(member);
    }
  };

  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || /^classDiagram(-v2)?$/.test(line)) {
      continue;
    }

    if (open) {
      if (line === '}') {
        open = undefined;
      } else {
        addMember(open, line);
      }
      continue;
    }

    const header = /^direction\s+([A-Za-z]{2})$/.exec(line);
    if (header) {
      const value = header[1].toUpperCase() as Direction;
      direction = DIRECTIONS.includes(value) ? value : 'TB';
      continue;
    }

    const cls = CLASS.exec(line);
    if (cls) {
      const [, id, label, brace] = cls;
      const entry = declare(id);
      if (label) {
        entry.label = label;
      }
      if (brace) {
        open = entry;
      }
      continue;
    }

    const relation = RELATION.exec(line);
    if (relation) {
      const [, left, leftCardinality, token, rightCardinality, right, label] = relation;
      declare(left);
      declare(right);
      const [, kind, leftIsTarget] = RELATIONS.find(([candidate]) => candidate === token)!;
      const [from, to] = leftIsTarget ? [right, left] : [left, right];
      const [fromCardinality, toCardinality] = leftIsTarget
        ? [rightCardinality, leftCardinality]
        : [leftCardinality, rightCardinality];
      relations.push({
        from,
        to,
        kind,
        ...(label ? { label: label.trim() } : {}),
        ...(fromCardinality ? { fromCardinality } : {}),
        ...(toCardinality ? { toCardinality } : {}),
      });
      continue;
    }

    const inline = INLINE_MEMBER.exec(line);
    if (inline) {
      const [, id, member] = inline;
      addMember(declare(id), member);
    }
  }

  return { direction, classes: [...classes.values()], relations };
};

/**
 * Box geometry in scene units; text sizes come from the shared per-weight metrics table
 * (`Layout.FONT_METRICS`): the title renders at the default weight (m), members at s.
 */
const TITLE_FONT = Layout.FONT_METRICS.m;
const MEMBER_FONT = Layout.FONT_METRICS.s;
const MIN_W = 160;
const MAX_W = 400;
const PAD_X = 24;
const TITLE_PAD = 10;
const SECTION_PAD = 14;
const GAP_MAIN = 90;
const GAP_CROSS = 60;

type ClassBox = {
  entry: UmlClass;
  w: number;
  h: number;
  titleH: number;
  attributesH: number;
  methodsH: number;
};

/** Compartment sizes derived from member counts and line lengths, per compartment font. */
const measure = (entry: UmlClass, maxWidth: number): ClassBox => {
  const titleW = Math.max(entry.label.length, (entry.stereotype?.length ?? 0) + 2) * TITLE_FONT.charW;
  const memberW =
    Math.max(0, ...[...entry.attributes, ...entry.methods].map((line) => line.length)) * MEMBER_FONT.charW;
  const w = Math.min(maxWidth, Math.max(MIN_W, Math.ceil(Math.max(titleW, memberW)) + PAD_X));
  // Lines wider than the clamped box wrap in the renderer; count the extra lines so the
  // compartment is tall enough and tldraw does not grow it over the one below.
  const lines = (text: string, font: Layout.FontMetrics) =>
    Math.max(1, Math.ceil((text.length * font.charW) / (w - PAD_X)));
  const memberH = (members: string[]) =>
    members.length
      ? members.reduce((sum, line) => sum + lines(line, MEMBER_FONT), 0) * MEMBER_FONT.lineH + SECTION_PAD
      : 0;
  const titleH = (lines(entry.label, TITLE_FONT) + (entry.stereotype ? 1 : 0)) * TITLE_FONT.lineH + TITLE_PAD;
  const attributesH = memberH(entry.attributes);
  const methodsH = memberH(entry.methods);
  return { entry, w, h: titleH + attributesH + methodsH, titleH, attributesH, methodsH };
};

/** Arrow styling per relation kind; dependency and realization render dashed, as in UML. */
export const relationStyle = (kind: RelationKind): { stroke?: Scene.Stroke } =>
  kind === 'dependency' || kind === 'realization' ? { stroke: 'dashed' } : {};

/** Mid-arrow label: cardinalities and the diamond glyph UML puts at the whole end. */
export const relationText = (relation: UmlRelation): string | undefined => {
  const glyph = relation.kind === 'composition' ? '◆' : relation.kind === 'aggregation' ? '◇' : undefined;
  const text = [relation.fromCardinality, relation.label ?? glyph, relation.toCardinality].filter(Boolean).join(' ');
  return text || undefined;
};

/**
 * Rank so arrows read upward where UML convention points at abstractions — inheritance,
 * realization, and dependency targets sit above their sources; containment and association
 * flow downward (whole/source above part/target).
 */
export const relationRanks = (model: UmlModel): Map<string, number> =>
  Layout.rank(
    model.classes.map((entry) => entry.id),
    model.relations.map((relation) =>
      relation.kind === 'inheritance' || relation.kind === 'realization' || relation.kind === 'dependency'
        ? { from: relation.to, to: relation.from }
        : { from: relation.from, to: relation.to },
    ),
  );

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
  /** Gap between ranks along the flow direction, in scene units (default 90). */
  gapMain?: number;
  /** Gap between classes within a rank, in scene units (default 60). */
  gapCross?: number;
  /** Maximum class-box width, in scene units (default 400); longer lines wrap. */
  maxWidth?: number;
};

/**
 * Compile a mermaid class diagram into scene commands: one world object per class (compartment
 * rects `title`/`attributes`/`methods`) and an `edges` object holding the relations as bound
 * arrows. Supertypes rank above subtypes, so inheritance reads downward.
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const model = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1, gapMain = GAP_MAIN, gapCross = GAP_CROSS, maxWidth = MAX_W } = options;
  const horizontal = model.direction === 'LR' || model.direction === 'RL';

  const ranks = relationRanks(model);

  const boxes = new Map(model.classes.map((entry) => [entry.id, measure(entry, maxWidth)]));

  // Group classes by rank, preserving declaration order within each lane.
  const lanes = new Map<number, ClassBox[]>();
  for (const entry of model.classes) {
    const value = ranks.get(entry.id) ?? 0;
    lanes.set(value, [...(lanes.get(value) ?? []), boxes.get(entry.id)!]);
  }

  const cross = (box: ClassBox) => (horizontal ? box.h : box.w);
  const main = (box: ClassBox) => (horizontal ? box.w : box.h);
  const laneSpan = (members: ClassBox[]) =>
    members.reduce((sum, box) => sum + cross(box), 0) + (members.length - 1) * gapCross;
  const widest = Math.max(...[...lanes.values()].map(laneSpan), 0);

  // Lanes advance along the main axis by their tallest member; members center on the widest lane.
  const positions = new Map<string, Scene.Point>();
  let mainOffset = 0;
  for (const lane of [...lanes.keys()].sort((left, right) => left - right)) {
    const members = lanes.get(lane)!;
    let crossOffset = (widest - laneSpan(members)) / 2;
    for (const box of members) {
      positions.set(box.entry.id, horizontal ? { x: mainOffset, y: crossOffset } : { x: crossOffset, y: mainOffset });
      crossOffset += cross(box) + gapCross;
    }
    mainOffset += Math.max(...members.map(main)) + gapMain;
  }

  // Arrow terminals clip at the bound compartment, so each endpoint binds to the compartment
  // nearest the peer's center — the arrow meets the box's outer edge instead of crossing the
  // compartments between that edge and the title, and mid-arrow labels land in the rank gap.
  const facing = (id: string, peerId: string): string => {
    const box = boxes.get(id)!;
    const peer = boxes.get(peerId)!;
    const targetY = positions.get(peerId)!.y + peer.h / 2;
    const baseY = positions.get(id)!.y;
    const compartments: [elementId: string, centerY: number][] = [['title', box.titleH / 2]];
    if (box.attributesH) {
      compartments.push(['attributes', box.titleH + box.attributesH / 2]);
    }
    if (box.methodsH) {
      compartments.push(['methods', box.titleH + box.attributesH + box.methodsH / 2]);
    }
    return compartments.reduce((best, candidate) =>
      Math.abs(baseY + candidate[1] - targetY) < Math.abs(baseY + best[1] - targetY) ? candidate : best,
    )[0];
  };

  const commands: Scene.Command[] = [];

  for (const entry of model.classes) {
    const box = boxes.get(entry.id)!;
    const point = positions.get(entry.id)!;
    const title = entry.stereotype ? `«${entry.stereotype}»\n${entry.label}` : entry.label;
    const elements: Scene.Element[] = [
      { kind: 'rect', id: 'title', x: 0, y: 0, w: box.w, h: box.titleH, text: title, fill: 'solid' },
    ];
    if (box.attributesH) {
      elements.push({
        kind: 'rect',
        id: 'attributes',
        x: 0,
        y: box.titleH,
        w: box.w,
        h: box.attributesH,
        text: entry.attributes.join('\n'),
        weight: 's',
      });
    }
    if (box.methodsH) {
      elements.push({
        kind: 'rect',
        id: 'methods',
        x: 0,
        y: box.titleH + box.attributesH,
        w: box.w,
        h: box.methodsH,
        text: entry.methods.join('\n'),
        weight: 's',
      });
    }
    commands.push({
      op: 'upsert-object',
      object: {
        id: entry.id,
        origin: { x: origin.x + point.x * scale, y: origin.y + point.y * scale },
        scale,
        elements,
      },
    });
  }

  if (model.relations.length > 0) {
    commands.push({
      op: 'upsert-object',
      object: {
        id: 'edges',
        origin,
        scale,
        elements: model.relations.map((relation, index) => {
          const text = relationText(relation);
          return {
            kind: 'arrow' as const,
            id: `${relation.from}-${relation.to}-${index}`,
            from: `${relation.from}/${facing(relation.from, relation.to)}`,
            to: `${relation.to}/${facing(relation.to, relation.from)}`,
            ...relationStyle(relation.kind),
            ...(text ? { text } : {}),
          };
        }),
      },
    });
  }

  return commands;
};

/** True when the mermaid source declares a class diagram rather than a flowchart. */
export const isClassDiagram = (source: string): boolean => /^\s*classDiagram(-v2)?\b/m.test(source);
