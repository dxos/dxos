//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const NodeType = Schema.Literals(['phone', 'laptop', 'server']);
export type NodeType = Schema.Schema.Type<typeof NodeType>;

export const NetworkKind = Schema.Literals(['devices', 'servers', 'cloud']);
export type NetworkKind = Schema.Schema.Type<typeof NetworkKind>;

export const PropValue = Schema.Union([Schema.String, Schema.Number, Schema.Boolean]);
export type PropValue = Schema.Schema.Type<typeof PropValue>;

export const Props = Schema.Record(Schema.String, PropValue);
export type Props = Schema.Schema.Type<typeof Props>;

const Range = Schema.Tuple([Schema.Number, Schema.Number]);
const Point = Schema.Tuple([Schema.Number, Schema.Number]);

export const NodeSpec = Schema.Struct({
  id: Schema.String,
  type: NodeType,
  props: Schema.optional(Props),
});
export type NodeSpec = Schema.Schema.Type<typeof NodeSpec>;

export interface NetworkSpec {
  readonly id: string;
  readonly kind: NetworkKind;
  readonly props?: Props;
  readonly nodes?: readonly NodeSpec[];
  readonly networks?: readonly NetworkSpec[];
  readonly generate?: {
    readonly nodes?: { readonly type: NodeType; readonly count: readonly [number, number] };
    readonly networks?: {
      readonly template: string;
      readonly count: readonly [number, number];
      readonly depth: number;
    };
  };
  /**
   * `at` is relative to the parent's centre; `near` places the network beside a sibling; `radius` is a minimum;
   * `gap` and `padding` space the network's children (defaults are tighter for servers than for devices).
   */
  readonly layout?: {
    readonly at?: readonly [number, number];
    readonly near?: string;
    readonly radius?: number;
    readonly gap?: number;
    readonly padding?: number;
  };
}

export const NetworkSpec: Schema.Codec<NetworkSpec> = Schema.Struct({
  id: Schema.String,
  kind: NetworkKind,
  props: Schema.optional(Props),
  nodes: Schema.optional(Schema.Array(NodeSpec)),
  networks: Schema.optional(Schema.Array(Schema.suspend((): Schema.Codec<NetworkSpec> => NetworkSpec))),
  generate: Schema.optional(
    Schema.Struct({
      nodes: Schema.optional(Schema.Struct({ type: NodeType, count: Range })),
      networks: Schema.optional(
        Schema.Struct({
          template: Schema.String,
          count: Range,
          depth: Schema.Number.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThan(0))),
        }),
      ),
    }),
  ),
  layout: Schema.optional(
    Schema.Struct({
      at: Schema.optional(Point),
      near: Schema.optional(Schema.String),
      radius: Schema.optional(Schema.Number),
      gap: Schema.optional(Schema.Number),
      padding: Schema.optional(Schema.Number),
    }),
  ),
});

export const LinkSpec = Schema.Union([
  Schema.Struct({ from: Schema.String, to: Schema.String }),
  Schema.Struct({
    rule: Schema.Literal('nearby'),
    k: Schema.Number.pipe(Schema.check(Schema.isInt(), Schema.isGreaterThan(0))),
    scope: Schema.String,
  }),
  Schema.Struct({
    rule: Schema.Literal('cloud'),
    scope: Schema.String,
    ratio: Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 }))),
  }),
]);
export type LinkSpec = Schema.Schema.Type<typeof LinkSpec>;

export const NetworkTemplate = Schema.Struct({
  networks: Schema.Array(NetworkSpec),
  templates: Schema.optional(Schema.Record(Schema.String, NetworkSpec)),
  links: Schema.optional(Schema.Array(LinkSpec)),
  /**
   * Top-level placement: `gap` between root networks; `spread` puts them in an evenly spaced belt this wide
   * around the pinned ones; `jitter` (0–1, default 0.5) is how far each strays from the belt's centre line.
   */
  layout: Schema.optional(
    Schema.Struct({
      gap: Schema.optional(Schema.Number),
      spread: Schema.optional(Schema.Number),
      jitter: Schema.optional(Schema.Number),
    }),
  ),
});
export type NetworkTemplate = Schema.Schema.Type<typeof NetworkTemplate>;
