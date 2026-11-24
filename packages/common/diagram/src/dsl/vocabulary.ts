//
// Copyright 2026 DXOS.org
//

//
// The words the DSL knows, shared by the parser, the printer, the linter and completion so they
// cannot drift apart — the round trip holds only because one table decides both which attributes
// an element accepts and the order they print in. Every literal set is read off `scene.ts` rather
// than restated, so a schema change shows up here as a type error or a new value, never as a
// silently stale list.
//

import { Shape } from '@dxos/scene';

import * as Semantic from '../semantic.ts';

/** Element kinds as the DSL spells them; each is also the scene element's `kind`. */
export const ELEMENT_KINDS = [
  ...Shape.BoxKind.literals,
  'circle',
  'line',
  'curve',
  'arc',
  'text',
  'arrow',
  'portal',
] as const;
export type ElementKind = (typeof ELEMENT_KINDS)[number];

/** Statements that state intent and leave layout to the engine. */
export const SEMANTIC_KEYWORDS = ['diagram', 'group', 'node', 'edge'] as const;

/**
 * Sequence-diagram words. Contextual: a keyword where a statement or fragment section starts and a
 * plain name anywhere else, so they are not {@link RESERVED} and ids may use them unquoted.
 */
export const SEQUENCE_KEYWORDS = ['note', 'fragment', 'else'] as const;

/** Statement keywords the grammar reserves. */
const RESERVED_STATEMENTS = ['object', 'elements', 'move', 'remove', ...SEMANTIC_KEYWORDS] as const;

/** Statement keywords, contextual ones included. */
export const STATEMENT_KEYWORDS = [...RESERVED_STATEMENTS, 'note', 'fragment'] as const;

/** Keywords inside semantic statements: `@cell(c,r)`, `via …`, `bus`, `compact`. */
export const CLAUSE_KEYWORDS = ['cell', 'via', 'bus', 'compact'] as const;

/**
 * Words the grammar reserves, so the printer knows to quote an id that collides with one.
 * `_` is reserved too: it is the unbound arrow end.
 */
export const RESERVED: ReadonlySet<string> = new Set<string>([
  ...RESERVED_STATEMENTS,
  // `grid` is contextual, so an id may still be called that; every other element kind is reserved.
  ...ELEMENT_KINDS.filter((kind) => kind !== 'grid'),
  ...CLAUSE_KEYWORDS,
  '_',
]);

/**
 * Attribute value shapes; `enum` carries the literals the schema allows, `size` is `WxH`, `ratio` is `W:H`.
 * `name` is a bare word from an open set a plugin extends, and `scalar` is a value of whichever of those three
 * shapes it reads as — the shape a contributed kind's own field takes, which no table here can know. `color` is
 * the open set the scene's `Color` schema checks: a theme name, a name at a tone, or a quoted CSS colour.
 */
export type AttrType =
  | { type: 'number' }
  | { type: 'color' }
  | { type: 'string' }
  | { type: 'boolean' }
  | { type: 'size' }
  | { type: 'ratio' }
  | { type: 'name' }
  | { type: 'scalar' }
  | { type: 'enum'; values: readonly string[] };

export type AttrSpec = AttrType & { name: string };

const COLOR: AttrSpec = { name: 'color', type: 'color' };

const STYLE: readonly AttrSpec[] = [
  COLOR,
  { name: 'fill', type: 'enum', values: Shape.Fill.literals },
  { name: 'stroke', type: 'enum', values: Shape.Stroke.literals },
  { name: 'weight', type: 'enum', values: Shape.Weight.literals },
  { name: 'align', type: 'enum', values: Shape.Align.literals },
  { name: 'valign', type: 'enum', values: Shape.VerticalAlign.literals },
  { name: 'fontSize', type: 'number' },
];

/** What a `grid` places with, and what a child needs to be placed by one. */
const GRID: readonly AttrSpec[] = [
  { name: 'cols', type: 'scalar' },
  { name: 'rows', type: 'scalar' },
  { name: 'gap', type: 'number' },
  { name: 'padding', type: 'number' },
  { name: 'layout', type: 'enum', values: Shape.Layout.literals },
  { name: 'packSeed', type: 'number' },
  { name: 'packMin', type: 'number' },
  { name: 'packMax', type: 'number' },
  { name: 'autoCols', type: 'scalar' },
  { name: 'autoRows', type: 'scalar' },
  { name: 'justifyContent', type: 'enum', values: Shape.Place.literals },
  { name: 'alignContent', type: 'enum', values: Shape.Place.literals },
  { name: 'parent', type: 'name' },
  { name: 'width', type: 'number' },
  { name: 'height', type: 'number' },
];

const BOX_ATTRS: readonly AttrSpec[] = [
  /**
   * The contributed element kind the box really is (`kind=card`). An open set: a plugin contributes kinds, so
   * unlike every other attribute here the values cannot be read off a schema. A box naming one also accepts that
   * kind's own attributes, which ride on `data` (see `KIND_ATTR`).
   */
  { name: 'kind', type: 'name' },
  { name: 'rotation', type: 'number' },
  { name: 'corners', type: 'enum', values: Shape.Corners.literals },
  ...GRID,
  ...STYLE,
];

/**
 * Attributes each element kind accepts, in the order they print. Geometry and the label are
 * positional, so the schema's `x`/`y`/`w`/`h`/`points`/`text` do not appear here — except
 * `text`'s wrap width, which the schema also calls `w`.
 */
export const ELEMENT_ATTRS: Record<ElementKind, readonly AttrSpec[]> = {
  rect: BOX_ATTRS,
  grid: BOX_ATTRS,
  ellipse: BOX_ATTRS,
  diamond: BOX_ATTRS,
  triangle: BOX_ATTRS,
  circle: STYLE,
  line: [{ name: 'closed', type: 'boolean' }, { name: 'guide', type: 'boolean' }, ...STYLE],
  curve: STYLE,
  arc: STYLE,
  text: [{ name: 'w', type: 'number' }, ...STYLE],
  arrow: [
    { name: 'head', type: 'enum', values: Shape.ArrowHead.literals },
    { name: 'tail', type: 'enum', values: Shape.ArrowTail.literals },
    { name: 'path', type: 'enum', values: Shape.Path.literals },
    { name: 'relation', type: 'enum', values: Shape.Relation.literals },
    ...STYLE,
  ],
  portal: [{ name: 'ref', type: 'string' }, ...STYLE],
};

/**
 * The flag that said whether a shape draws its outline before `stroke=none` did, which the reader still takes
 * wherever `stroke` is taken; nothing prints or completes it.
 */
export const LEGACY_BORDER: AttrSpec = { name: 'border', type: 'boolean' };

/** `specs` and, where they state a stroke, the flag older text states it with. */
export const withLegacy = (specs: readonly AttrSpec[]): readonly AttrSpec[] =>
  specs.some(({ name }) => name === 'stroke') ? [...specs, LEGACY_BORDER] : specs;

/**
 * The attribute that names a contributed kind. A box carrying it takes that kind's own attributes too: no table
 * can list them, since the plugin that defines the kind is what decides them.
 */
export const KIND_ATTR = 'kind';

/**
 * Prefix that marks a kind's own field whose name an element attribute already claims: `substrate` keeps a numeric
 * `fill`, and `fill` is also the style attribute, so it is written `data-fill=0.55`. The prefix escapes itself, so
 * a kind field genuinely named `data-fill` is written `data-data-fill` and reads back as its own name.
 */
export const DATA_PREFIX = 'data-';

/**
 * The DSL spelling of a kind's field, or `undefined` where the name has none. A name is escaped when an element
 * attribute claims it, when the grammar reserves it (`text=hello` would not parse, since `AttrName` is a plain
 * name token and `text` is a keyword), and when it already starts with the prefix, so the escape is reversible.
 * A name that is not a bare word at all — `font.size`, which no `AttrName` can spell — has no escape: prefixing
 * it leaves it just as unparseable, so it is left out, as a value the DSL cannot spell is.
 */
export const dataAttrName = (name: string, claimed: ReadonlySet<string>): string | undefined => {
  if (!BARE_ID.test(name)) {
    return undefined;
  }
  return claimed.has(name) || RESERVED.has(name) || name.startsWith(DATA_PREFIX) ? `${DATA_PREFIX}${name}` : name;
};

/** The field name a DSL attribute spells, the inverse of {@link dataAttrName}. */
export const dataFieldName = (name: string): string =>
  name.startsWith(DATA_PREFIX) ? name.slice(DATA_PREFIX.length) : name;

/** Object attributes other than `@ <origin>`, in the order they print. */
export const OBJECT_ATTRS: readonly AttrSpec[] = [
  { name: 'scale', type: 'number' },
  { name: 'index', type: 'string' },
  { name: 'ref', type: 'string' },
];

/** The rule a grid diagram's frame divides by; a group states the same. */
const RULE: readonly AttrSpec[] = [
  { name: 'cols', type: 'scalar' },
  { name: 'rows', type: 'scalar' },
  { name: 'gap', type: 'number' },
  { name: 'padding', type: 'number' },
  { name: 'autoCols', type: 'scalar' },
  { name: 'autoRows', type: 'scalar' },
  { name: 'justifyContent', type: 'enum', values: Shape.Place.literals },
  { name: 'alignContent', type: 'enum', values: Shape.Place.literals },
  { name: 'layout', type: 'enum', values: Shape.Layout.literals },
  { name: 'packSeed', type: 'number' },
  { name: 'packMin', type: 'number' },
  { name: 'packMax', type: 'number' },
];

/** The rule's attributes other than `gap`, which every kind's group reads. */
export const GRID_RULE_ATTRS: readonly string[] = RULE.map(({ name }) => name).filter((name) => name !== 'gap');

/** The frame a grid diagram draws round a group's members. */
export const GROUP_FRAME_ATTRS: readonly string[] = ['fill', 'stroke'];

/** `diagram` attributes. */
export const DIAGRAM_ATTRS: readonly AttrSpec[] = [
  { name: 'kind', type: 'enum', values: Semantic.DIAGRAM_KINDS },
  { name: 'flow', type: 'enum', values: Semantic.FLOWS },
  { name: 'grid', type: 'size' },
  { name: 'box', type: 'size' },
  { name: 'aspect', type: 'ratio' },
  { name: 'size', type: 'size' },
  ...RULE,
];

/** `group` attributes. */
export const GROUP_ATTRS: readonly AttrSpec[] = [
  ...RULE,
  { name: 'max-width', type: 'number' },
  COLOR,
  { name: 'fill', type: 'enum', values: Shape.Fill.literals },
  { name: 'stroke', type: 'enum', values: Shape.Stroke.literals },
];

/** `node` attributes. A node naming a component (`kind=card`) also takes that component's own, as a box does. */
export const NODE_ATTRS: readonly AttrSpec[] = [
  { name: 'kind', type: 'name' },
  { name: 'ref', type: 'string' },
  { name: 'role', type: 'enum', values: Semantic.ROLES },
  { name: 'shape', type: 'enum', values: Shape.BoxKind.literals },
  COLOR,
  { name: 'fill', type: 'enum', values: Shape.Fill.literals },
  { name: 'stroke', type: 'enum', values: Shape.Stroke.literals },
  // The size the node keeps in its cell. Not `size`, which a component may name a field of its own.
  { name: 'width', type: 'number' },
  { name: 'height', type: 'number' },
];

/** `edge` attributes. */
export const EDGE_ATTRS: readonly AttrSpec[] = [
  { name: 'head', type: 'enum', values: Shape.ArrowHead.literals },
  { name: 'tail', type: 'enum', values: Shape.ArrowTail.literals },
  { name: 'path', type: 'enum', values: Shape.Path.literals },
  { name: 'stroke', type: 'enum', values: Shape.Stroke.literals },
  COLOR,
];

/** `note` attributes. */
export const NOTE_ATTRS: readonly AttrSpec[] = [COLOR];

/** Placement relations a `node` or `group` may state; `~` before one makes it a preference. */
export const RELATION_WORDS: readonly string[] = Semantic.RELATION_KINDS;

/** An id that needs no quoting: a bare word that is not reserved. */
export const BARE_ID = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** A ref that needs no quoting: every segment is a bare word. */
export const BARE_REF = /^[A-Za-z_][A-Za-z0-9_-]*(\/[A-Za-z_][A-Za-z0-9_-]*)?(#[A-Za-z_][A-Za-z0-9_-]*)?$/;

/**
 * A structurally valid ref — `[object/]element[#port]`, as `Shape.parseRef` reads it, whose ids may
 * not contain `/` or `#`. Separate from {@link BARE_REF} because quoting exists to carry a ref
 * whose ids cannot lex bare (`1st/box` from a numeric node id), which is well-formed all the same.
 */
export const REF_SHAPE = /^[^/#]+(\/[^/#]+)?(#[^/#]+)?$/;
