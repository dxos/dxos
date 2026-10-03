//
// Copyright 2026 DXOS.org
//

import * as Ontology from '../../Ontology.ts';
import { type Node } from '../analyzers/ast.ts';
import { memberIri } from './Boundary.ts';
import * as Term from './Term.ts';

/**
 * Hand-written signatures for the library calls the rule files care about (`design/TYPES.md`,
 * "Models"). Each is keyed by the canonical member IRI of the callee and bails out like the core
 * rules: an argument it cannot type makes the corresponding position unknown, never a guess. Every
 * model is checked against `tsc` by the agreement fixtures.
 */

export type GeneratorSummary = {
  /** The operands of `yield*`, as nodes: a service class is recognized by its declaration, not its type. */
  readonly yields: readonly Node[];
  readonly returned: Term.Type;
};

export type ModelContext = {
  readonly expression: (node: Node) => Term.Type;
  /** An expression evaluated as under a `const` type parameter: literals kept, properties readonly. */
  readonly constExpression: (node: Node) => Term.Type;
  /** The widened return type of a function argument, as inferred for a type parameter. */
  readonly returned: (node: Node) => Term.Type;
  readonly callee: (node: Node) => string | undefined;
  /** `[Self, Shape]` of a local `Context.Service` class referenced by `node`. */
  readonly serviceKey: (node: Node) => readonly [Term.Type, Term.Type] | undefined;
  readonly generator: (node: Node) => GeneratorSummary | undefined;
};

export type Model = {
  /** The type of the member itself, for a constant (`Effect.void`, `Schema.String`). */
  readonly value?: Term.Type;
  /** A data-first call. */
  readonly call?: (args: readonly Node[], node: Node, context: ModelContext) => Term.Type;
  /** A data-last call used as a `.pipe(…)` stage, applied to `self`. */
  readonly pipe?: (args: readonly Node[], self: Term.Type, context: ModelContext) => Term.Type;
};

export type TypeArity = { readonly arity: number; readonly defaults: readonly Term.Type[] };

const effect = (module: string, name: string) => memberIri(`effect/${module}`, [name]);

const EFFECT = effect('Effect', 'Effect');
const LAYER = effect('Layer', 'Layer');
const SCOPE = effect('Scope', 'Scope');
const SERVICE = effect('Context', 'Service');

const effectOf = (value: Term.Type, error: Term.Type, requirements: Term.Type) =>
  Term.ref(EFFECT, [value, error, requirements]);

const layerOf = (output: Term.Type, error: Term.Type, input: Term.Type) => Term.ref(LAYER, [output, error, input]);

/** `[A, E, R]` of an `Effect` (or `[ROut, E, RIn]` of a `Layer`); unknowns when it is not one. */
const parts = (type: Term.Type, head: string): readonly [Term.Type, Term.Type, Term.Type] =>
  type.kind === 'ref' && type.iri === head && type.args.length === 3
    ? [type.args[0], type.args[1], type.args[2]]
    : [
        Term.unresolved('model:not-effect-or-layer'),
        Term.unresolved('model:not-effect-or-layer'),
        Term.unresolved('model:not-effect-or-layer'),
      ];

const membersOf = (type: Term.Type): readonly Term.Type[] => (type.kind === 'union' ? type.members : [type]);

/**
 * `Exclude<from, remove>` over named members: a member goes when it is one of `remove`'s members.
 * Exact for service identities, which are distinct classes; any unknown keeps the position unknown.
 */
const exclude = (from: Term.Type, remove: Term.Type): Term.Type => {
  if (from.kind === 'unresolved' || remove.kind === 'unresolved') {
    return Term.unresolved('model:exclude');
  }
  const removed = new Set(membersOf(remove).map(Term.text));
  const kept = membersOf(from);
  if (kept.some((member) => member.kind !== 'ref' && !(member.kind === 'primitive' && member.name === 'never'))) {
    return Term.unresolved('model:exclude');
  }
  return Term.union(kept.filter((member) => !removed.has(Term.text(member))));
};

/** A union that stays unknown if any part is: `E1 | ?` is not a union we can state. */
const knownUnion = (members: readonly Term.Type[]): Term.Type =>
  members.some((member) => member.kind === 'unresolved') ? Term.unresolved('model:union-part') : Term.union(members);

const tagIdentity = (tag: Node | undefined, context: ModelContext): Term.Type =>
  (tag && context.serviceKey(tag)?.[0]) ?? Term.unresolved('model:service-tag-not-local');

const merge = (self: Term.Type, that: Term.Type): Term.Type => {
  const [selfOut, selfError, selfIn] = parts(self, LAYER);
  const [thatOut, thatError, thatIn] = parts(that, LAYER);
  return layerOf(knownUnion([thatOut, selfOut]), knownUnion([thatError, selfError]), knownUnion([thatIn, selfIn]));
};

const provide = (self: Term.Type, that: Term.Type): Term.Type => {
  const [selfOut, selfError, selfIn] = parts(self, LAYER);
  const [thatOut, thatError, thatIn] = parts(that, LAYER);
  return layerOf(selfOut, knownUnion([thatError, selfError]), knownUnion([thatIn, exclude(selfIn, thatOut)]));
};

/** `Layer<ROut | ROut2, E | E2, RIn | Exclude<RIn2, ROut>>`: `provide` that also keeps `that`'s outputs. */
const provideMerge = (self: Term.Type, that: Term.Type): Term.Type => {
  const [selfOut, selfError, selfIn] = parts(self, LAYER);
  const [thatOut, thatError, thatIn] = parts(that, LAYER);
  return layerOf(
    knownUnion([thatOut, selfOut]),
    knownUnion([thatError, selfError]),
    knownUnion([thatIn, exclude(selfIn, thatOut)]),
  );
};

/** An argument that is an array literal is the `Layers` tuple overload — not modeled. */
const isArrayArgument = (node: Node | undefined) => node?.type === 'ArrayExpression';

const values = new Map<string, Model>([
  [effect('Effect', 'void'), { value: effectOf(Term.void_, Term.never, Term.never) }],
  [
    effect('Effect', 'succeed'),
    {
      call: ([value], _node, context) =>
        effectOf(
          value ? Term.widen(context.expression(value)) : Term.unresolved('model:Effect.succeed'),
          Term.never,
          Term.never,
        ),
    },
  ],
  [
    effect('Effect', 'fail'),
    {
      call: ([error], _node, context) =>
        effectOf(
          Term.never,
          error ? Term.widen(context.expression(error)) : Term.unresolved('model:Effect.fail'),
          Term.never,
        ),
    },
  ],
  [
    effect('Effect', 'sync'),
    {
      call: ([thunk], _node, context) =>
        effectOf(thunk ? context.returned(thunk) : Term.unresolved('model:Effect.sync'), Term.never, Term.never),
    },
  ],
  [
    effect('Effect', 'gen'),
    {
      call: (args, _node, context) => {
        const summary = args.length === 1 ? context.generator(args[0]) : undefined;
        if (!summary) {
          return Term.unresolved('model:Effect.gen');
        }
        const errors: Term.Type[] = [];
        const requirements: Term.Type[] = [];
        for (const operand of summary.yields) {
          const key = context.serviceKey(operand);
          if (key) {
            requirements.push(key[0]);
            continue;
          }
          const [, error, requirement] = parts(context.expression(operand), EFFECT);
          errors.push(error);
          requirements.push(requirement);
        }
        return effectOf(summary.returned, knownUnion(errors), knownUnion(requirements));
      },
    },
  ],
  [effect('Layer', 'empty'), { value: layerOf(Term.never, Term.never, Term.never) }],
  [
    effect('Layer', 'succeed'),
    {
      call: (args, _node, context) =>
        args.length === 2
          ? layerOf(tagIdentity(args[0], context), Term.never, Term.never)
          : Term.unresolved('model:Layer.succeed'),
    },
  ],
  [
    effect('Layer', 'sync'),
    {
      call: (args, _node, context) =>
        args.length === 2
          ? layerOf(tagIdentity(args[0], context), Term.never, Term.never)
          : Term.unresolved('model:Layer.sync'),
    },
  ],
  [
    effect('Layer', 'effect'),
    {
      call: (args, _node, context) => {
        if (args.length !== 2) {
          return Term.unresolved('model:Layer.effect');
        }
        const [, error, requirements] = parts(context.expression(args[1]), EFFECT);
        return layerOf(tagIdentity(args[0], context), error, exclude(requirements, Term.ref(SCOPE)));
      },
    },
  ],
  [
    effect('Layer', 'mergeAll'),
    {
      call: (args, _node, context) => {
        if (args.length === 0) {
          return Term.unresolved('model:Layer.mergeAll');
        }
        const layers = args.map((arg) => parts(context.expression(arg), LAYER));
        return layerOf(
          knownUnion(layers.map(([output]) => output)),
          knownUnion(layers.map(([, error]) => error)),
          knownUnion(layers.map(([, , input]) => input)),
        );
      },
    },
  ],
  [
    effect('Layer', 'merge'),
    {
      call: (args, _node, context) =>
        args.length === 2 && !isArrayArgument(args[1])
          ? merge(context.expression(args[0]), context.expression(args[1]))
          : Term.unresolved('model:Layer.merge'),
      pipe: (args, self, context) =>
        args.length === 1 && !isArrayArgument(args[0])
          ? merge(self, context.expression(args[0]))
          : Term.unresolved('model:Layer.merge'),
    },
  ],
  [
    effect('Layer', 'provide'),
    {
      call: (args, _node, context) =>
        args.length === 2 && !isArrayArgument(args[1])
          ? provide(context.expression(args[0]), context.expression(args[1]))
          : Term.unresolved('model:Layer.provide'),
      pipe: (args, self, context) =>
        args.length === 1 && !isArrayArgument(args[0])
          ? provide(self, context.expression(args[0]))
          : Term.unresolved('model:Layer.provide'),
    },
  ],
  [
    effect('Layer', 'provideMerge'),
    {
      call: (args, _node, context) =>
        args.length === 2 && !isArrayArgument(args[1])
          ? provideMerge(context.expression(args[0]), context.expression(args[1]))
          : Term.unresolved('model:Layer.provideMerge'),
      pipe: (args, self, context) =>
        args.length === 1 && !isArrayArgument(args[0])
          ? provideMerge(self, context.expression(args[0]))
          : Term.unresolved('model:Layer.provideMerge'),
    },
  ],
  [
    effect('Layer', 'effectDiscard'),
    {
      call: (args, _node, context) => {
        if (args.length !== 1) {
          return Term.unresolved('model:Layer.effectDiscard');
        }
        const [, error, requirements] = parts(context.expression(args[0]), EFFECT);
        return layerOf(Term.never, error, exclude(requirements, Term.ref(SCOPE)));
      },
    },
  ],
  [effect('Schema', 'String'), { value: Term.ref(effect('Schema', 'String')) }],
  [effect('Schema', 'Number'), { value: Term.ref(effect('Schema', 'Number')) }],
  [effect('Schema', 'Boolean'), { value: Term.ref(effect('Schema', 'Boolean')) }],
  [effect('Schema', 'Unknown'), { value: Term.ref(effect('Schema', 'Unknown')) }],
  [
    effect('Schema', 'Struct'),
    {
      call: ([fields], _node, context) => {
        const type =
          fields?.type === 'ObjectExpression'
            ? context.constExpression(fields)
            : Term.unresolved('model:Schema.Struct');
        return type.kind === 'object'
          ? Term.ref(effect('Schema', 'Struct'), [type])
          : Term.unresolved('model:Schema.Struct');
      },
    },
  ],
  [
    effect('Schema', 'Literal'),
    {
      call: ([value], _node, context) => {
        const type = value ? Term.settle(context.expression(value)) : Term.unresolved('model:Schema.Literal');
        return type.kind === 'literal'
          ? Term.ref(effect('Schema', 'Literal'), [type])
          : Term.unresolved('model:Schema.Literal');
      },
    },
  ],
]);

const types = new Map<string, TypeArity>([
  [EFFECT, { arity: 3, defaults: [Term.never, Term.never] }],
  [LAYER, { arity: 3, defaults: [Term.never, Term.never] }],
  [effect('Stream', 'Stream'), { arity: 3, defaults: [Term.never, Term.never] }],
  [effect('Context', 'Key'), { arity: 2, defaults: [] }],
  [SCOPE, { arity: 0, defaults: [] }],
]);

export const MODELS = {
  values,
  types,
  serviceIri: SERVICE,
  effectIri: EFFECT,
  genIri: effect('Effect', 'gen'),
  /** Every `effect/<Module>` member IRI starts with this. */
  effectModuleBase: `${Ontology.MODULE_BASE}effect/`,
} as const;
