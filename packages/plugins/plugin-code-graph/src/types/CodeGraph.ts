//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';

export const SKILL_KEY = 'org.dxos.skill.codeGraph';

/**
 * Most boxes one graph holds. Protects the document and the layouts, which slow sharply past a few hundred
 * boxes, from an assistant expanding without end; a graph that size is unreadable anyway.
 */
export const MAX_NODES = 300;

/** Adding would take a graph past {@link MAX_NODES}. */
export class LimitError extends BaseError.extend('LimitError', `A code graph holds at most ${MAX_NODES} boxes.`) {}

/** What a box depicts, derived from its IRI's namespace in the code-index ontology. */
export const NodeKind = Schema.Literals(['package', 'file', 'symbol', 'module', 'spec', 'other']);
export type NodeKind = Schema.Schema.Type<typeof NodeKind>;

/** How the canvas places the boxes. */
export const Layout = Schema.Literals(['illustrator', 'force', 'rank', 'diagram']);
export type Layout = Schema.Schema.Type<typeof Layout>;

export const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Position = Schema.Schema.Type<typeof Position>;

/** One box: a code-index resource. */
export const Node = Schema.Struct({
  /** The resource's IRI in the index, e.g. `https://dxos.org/deus/file/packages/common/log/src/index.ts`. */
  id: Schema.String,
  label: Schema.String,
  kind: NodeKind,
  /** The package the resource belongs to, which the illustrator layout frames when the graph is grouped. */
  group: Schema.optional(Schema.String),
  /** Where the user dragged the box; a box without one is laid out automatically. */
  position: Schema.optional(Position),
});
export type Node = Schema.Schema.Type<typeof Node>;

/** One arrow, from the subject to the object of a triple. */
export const Edge = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  /** The predicate's local name, e.g. `imports` or `usesPackage`. */
  kind: Schema.optional(Schema.String),
});
export type Edge = Schema.Schema.Type<typeof Edge>;

/**
 * A curated view of the code index: the boxes and arrows the user or the assistant chose to show. Held
 * inline rather than as objects per box, since every box stands for a resource that lives in the index.
 */
export const TYPENAME = 'org.dxos.type.codeGraph';

export class CodeGraph extends Type.makeObject<CodeGraph>(DXN.make(TYPENAME, '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String.annotate({ title: 'Name' })),
    layout: Schema.optional(Layout.pipe(Annotation.FormInputAnnotation.set(false))),
    /** Frame each package's boxes together; the illustrator layout and drawing honour it. */
    grouped: Schema.optional(Schema.Boolean.pipe(Annotation.FormInputAnnotation.set(false))),
    nodes: Schema.Array(Node).pipe(Annotation.FormInputAnnotation.set(false)),
    edges: Schema.Array(Edge).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--graph--regular', hue: 'teal' }),
    // A chat about a graph needs the tools that query the index and reshape the graph.
    Skill.SkillsAnnotation.set([SKILL_KEY]),
    Annotation.UserType.set(),
  ),
) {}

/** Arrays start empty so two peers lazily creating them cannot each write a fresh one. */
export const make = (props: Partial<Obj.MakeProps<typeof CodeGraph>> = {}): CodeGraph =>
  Obj.make(CodeGraph, { layout: 'illustrator', nodes: [], edges: [], ...props });

export const instanceOf = (value: unknown): value is CodeGraph => Obj.instanceOf(CodeGraph, value);
