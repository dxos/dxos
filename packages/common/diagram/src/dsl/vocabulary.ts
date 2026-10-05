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

import * as Scene from '../scene.ts';
import * as Semantic from '../semantic.ts';

/** Element kinds as the DSL spells them; each is also the scene element's `kind`. */
export const ELEMENT_KINDS = [
  ...Scene.BoxKind.literals,
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

/** Statement keywords. */
export const STATEMENT_KEYWORDS = ['object', 'elements', 'move', 'remove', ...SEMANTIC_KEYWORDS] as const;

/** Keywords inside semantic statements: `@cell(c,r)`, `via …`, `bus`. */
export const CLAUSE_KEYWORDS = ['cell', 'via', 'bus'] as const;

/**
 * Words the grammar reserves, so the printer knows to quote an id that collides with one.
 * `_` is reserved too: it is the unbound arrow end.
 */
export const RESERVED: ReadonlySet<string> = new Set<string>([
  ...STATEMENT_KEYWORDS,
  ...ELEMENT_KINDS,
  ...CLAUSE_KEYWORDS,
  '_',
]);

/** Attribute value shapes; `enum` carries the literals the schema allows, `size` is `WxH`. */
export type AttrType =
  | { type: 'number' }
  | { type: 'string' }
  | { type: 'boolean' }
  | { type: 'size' }
  | { type: 'enum'; values: readonly string[] };

export type AttrSpec = AttrType & { name: string };

const STYLE: readonly AttrSpec[] = [
  { name: 'color', type: 'enum', values: Scene.Color.literals },
  { name: 'fill', type: 'enum', values: Scene.Fill.literals },
  { name: 'stroke', type: 'enum', values: Scene.Stroke.literals },
  { name: 'weight', type: 'enum', values: Scene.Weight.literals },
];

const BOX_ATTRS: readonly AttrSpec[] = [
  { name: 'rotation', type: 'number' },
  { name: 'corners', type: 'enum', values: Scene.Corners.literals },
  ...STYLE,
];

/**
 * Attributes each element kind accepts, in the order they print. Geometry and the label are
 * positional, so the schema's `x`/`y`/`w`/`h`/`points`/`text` do not appear here — except
 * `text`'s wrap width, which the schema also calls `w`.
 */
export const ELEMENT_ATTRS: Record<ElementKind, readonly AttrSpec[]> = {
  rect: BOX_ATTRS,
  ellipse: BOX_ATTRS,
  diamond: BOX_ATTRS,
  triangle: BOX_ATTRS,
  circle: STYLE,
  line: [{ name: 'closed', type: 'boolean' }, ...STYLE],
  curve: STYLE,
  arc: STYLE,
  text: [{ name: 'w', type: 'number' }, ...STYLE],
  arrow: [
    { name: 'head', type: 'enum', values: Scene.ArrowHead.literals },
    { name: 'tail', type: 'enum', values: Scene.ArrowTail.literals },
    { name: 'relation', type: 'enum', values: Scene.Relation.literals },
    ...STYLE,
  ],
  portal: [{ name: 'ref', type: 'string' }, ...STYLE],
};

/** Object attributes other than `@ <origin>`, in the order they print. */
export const OBJECT_ATTRS: readonly AttrSpec[] = [
  { name: 'scale', type: 'number' },
  { name: 'index', type: 'string' },
  { name: 'ref', type: 'string' },
];

/** `diagram` attributes. */
export const DIAGRAM_ATTRS: readonly AttrSpec[] = [
  { name: 'flow', type: 'enum', values: Semantic.FLOWS },
  { name: 'grid', type: 'size' },
  { name: 'box', type: 'size' },
];

/** `group` attributes. */
export const GROUP_ATTRS: readonly AttrSpec[] = [
  { name: 'gap', type: 'number' },
  { name: 'color', type: 'enum', values: Scene.Color.literals },
];

/** `node` attributes. */
export const NODE_ATTRS: readonly AttrSpec[] = [
  { name: 'ref', type: 'string' },
  { name: 'shape', type: 'enum', values: Scene.BoxKind.literals },
  { name: 'color', type: 'enum', values: Scene.Color.literals },
  { name: 'fill', type: 'enum', values: Scene.Fill.literals },
  { name: 'stroke', type: 'enum', values: Scene.Stroke.literals },
];

/** `edge` attributes. */
export const EDGE_ATTRS: readonly AttrSpec[] = [
  { name: 'head', type: 'enum', values: Scene.ArrowHead.literals },
  { name: 'tail', type: 'enum', values: Scene.ArrowTail.literals },
  { name: 'stroke', type: 'enum', values: Scene.Stroke.literals },
  { name: 'color', type: 'enum', values: Scene.Color.literals },
];

/** Placement relations a `node` or `group` may state; `~` before one makes it a preference. */
export const RELATION_WORDS: readonly string[] = Semantic.RELATION_KINDS;

/** An id that needs no quoting: a bare word that is not reserved. */
export const BARE_ID = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** A ref that needs no quoting: every segment is a bare word. */
export const BARE_REF = /^[A-Za-z_][A-Za-z0-9_-]*(\/[A-Za-z_][A-Za-z0-9_-]*)?(#[A-Za-z_][A-Za-z0-9_-]*)?$/;

/**
 * A structurally valid ref — `[object/]element[#port]`, as `Scene.parseRef` reads it, whose ids may
 * not contain `/` or `#`. Separate from {@link BARE_REF} because quoting exists to carry a ref
 * whose ids cannot lex bare (`1st/box` from a numeric node id), which is well-formed all the same.
 */
export const REF_SHAPE = /^[^/#]+(\/[^/#]+)?(#[^/#]+)?$/;
