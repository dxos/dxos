//
// Copyright 2026 DXOS.org
//

//
// Mermaid class-diagram dialect: parses the subset needed for UML class diagrams (class blocks
// with members, stereotypes, and the standard relation arrows) and compiles it to scene commands
// with a layered layout — supertypes above subtypes. Mermaid carries no coordinates, so the
// dialect owns placement; see `dialect.ts` for the contract.
//

import * as Layout from './layout';
import type * as Scene from './scene';

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
 * Layout constants in scene units, calibrated to tldraw's font metrics: `weight` maps to tldraw
 * `size`, where the title's default (m) runs ~25px and the members' (s) ~18px per line.
 */
const MIN_W = 160;
const MAX_W = 400;
const TITLE_CHAR_W = 15;
const MEMBER_CHAR_W = 12;
const PAD_X = 24;
const TITLE_H = 44;
const STEREOTYPE_H = 32;
const LINE_H = 26;
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

/** Compartment sizes derived from member counts and the longest line, per compartment font. */
const measure = (entry: UmlClass): ClassBox => {
  const titleW = Math.max(entry.label.length, (entry.stereotype?.length ?? 0) + 2) * TITLE_CHAR_W;
  const memberW = Math.max(0, ...[...entry.attributes, ...entry.methods].map((line) => line.length)) * MEMBER_CHAR_W;
  const w = Math.min(MAX_W, Math.max(MIN_W, Math.ceil(Math.max(titleW, memberW)) + PAD_X));
  const titleH = TITLE_H + (entry.stereotype ? STEREOTYPE_H : 0);
  const attributesH = entry.attributes.length ? entry.attributes.length * LINE_H + SECTION_PAD : 0;
  const methodsH = entry.methods.length ? entry.methods.length * LINE_H + SECTION_PAD : 0;
  return { entry, w, h: titleH + attributesH + methodsH, titleH, attributesH, methodsH };
};

/** Arrow styling per relation kind; dependency and realization render dashed, as in UML. */
const relationStyle = (kind: RelationKind): { stroke?: Scene.Stroke } =>
  kind === 'dependency' || kind === 'realization' ? { stroke: 'dashed' } : {};

/** Mid-arrow label: cardinalities and the diamond glyph UML puts at the whole end. */
const relationText = (relation: UmlRelation): string | undefined => {
  const glyph = relation.kind === 'composition' ? '◆' : relation.kind === 'aggregation' ? '◇' : undefined;
  const text = [relation.fromCardinality, relation.label ?? glyph, relation.toCardinality].filter(Boolean).join(' ');
  return text || undefined;
};

export type CompileOptions = {
  /** Canvas position of the diagram's top-left, in canvas px. */
  origin?: Scene.Point;
  /** Canvas px per scene unit. */
  scale?: number;
};

/**
 * Compile a mermaid class diagram into scene commands: one world object per class (compartment
 * rects `title`/`attributes`/`methods`) and an `edges` object holding the relations as bound
 * arrows. Supertypes rank above subtypes, so inheritance reads downward.
 */
export const compile = (source: string, options: CompileOptions = {}): Scene.Command[] => {
  const model = parse(source);
  const { origin = { x: 0, y: 0 }, scale = 1 } = options;
  const horizontal = model.direction === 'LR' || model.direction === 'RL';

  // Rank flows supertype → subtype for inheritance/realization, source → target otherwise.
  const ranks = Layout.rank(
    model.classes.map((entry) => entry.id),
    model.relations.map((relation) =>
      relation.kind === 'inheritance' || relation.kind === 'realization'
        ? { from: relation.to, to: relation.from }
        : { from: relation.from, to: relation.to },
    ),
  );

  const boxes = new Map(model.classes.map((entry) => [entry.id, measure(entry)]));

  // Group classes by rank, preserving declaration order within each lane.
  const lanes = new Map<number, ClassBox[]>();
  for (const entry of model.classes) {
    const value = ranks.get(entry.id) ?? 0;
    lanes.set(value, [...(lanes.get(value) ?? []), boxes.get(entry.id)!]);
  }

  const cross = (box: ClassBox) => (horizontal ? box.h : box.w);
  const main = (box: ClassBox) => (horizontal ? box.w : box.h);
  const laneSpan = (members: ClassBox[]) =>
    members.reduce((sum, box) => sum + cross(box), 0) + (members.length - 1) * GAP_CROSS;
  const widest = Math.max(...[...lanes.values()].map(laneSpan), 0);

  // Lanes advance along the main axis by their tallest member; members center on the widest lane.
  const positions = new Map<string, Scene.Point>();
  let mainOffset = 0;
  for (const lane of [...lanes.keys()].sort((left, right) => left - right)) {
    const members = lanes.get(lane)!;
    let crossOffset = (widest - laneSpan(members)) / 2;
    for (const box of members) {
      positions.set(box.entry.id, horizontal ? { x: mainOffset, y: crossOffset } : { x: crossOffset, y: mainOffset });
      crossOffset += cross(box) + GAP_CROSS;
    }
    mainOffset += Math.max(...members.map(main)) + GAP_MAIN;
  }

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
            from: `${relation.from}/title`,
            to: `${relation.to}/title`,
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
