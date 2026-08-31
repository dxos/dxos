//
// Copyright 2026 DXOS.org
//

import { type JsonObject, type Message } from '@bufbuild/protobuf';

import { type Struct, type WithTypeUrl } from '@dxos/codec';
import { type PublicKey } from '@dxos/keys';
import { type Timeframe } from '@dxos/timeframe';

/**
 * The protobuf.js-shaped view of a buf message, as `encodeCompat`/`decodeCompat` produce it.
 *
 * Consumers can therefore describe compat values without importing the protobuf.js generated
 * types, which is what lets `@dxos/protobuf-compiler` and its output be deleted. It mirrors
 * `shape-compat.ts` exactly: the substituted messages become their JS counterparts, `Any` becomes
 * a `@type`-tagged bag, and oneof groups flatten from buf's `{ case, value }` into the sibling
 * optional fields protobuf.js emits.
 *
 * Field presence is a widening rather than a match: buf cannot recover proto3's `optional` marker
 * from a generated type, so every singular message field arrives optional here even where
 * protobuf.js declared it required. Legacy-typed values are therefore assignable to `Compat`, not
 * the reverse, and a consumer moving onto it has to handle the absent case.
 */
export type Compat<T> = [T] extends [never]
  ? never
  : T extends Uint8Array
    ? T
    : T extends { readonly $typeName: 'dxos.keys.PublicKey' }
      ? PublicKey
      : T extends { readonly $typeName: 'dxos.keys.PrivateKey' }
        ? Buffer
        : T extends { readonly $typeName: 'dxos.echo.timeframe.TimeframeVector' }
          ? Timeframe
          : T extends { readonly $typeName: 'google.protobuf.Timestamp' }
            ? Date
            : T extends { readonly $typeName: 'google.protobuf.Struct' }
              ? Struct
              : T extends { readonly $typeName: 'google.protobuf.Any' }
                ? WithTypeUrl<Record<string, unknown>>
                : T extends readonly (infer Element)[]
                  ? Compat<Element>[]
                  : T extends Message<string>
                    ? CompatMessage<T>
                    : T extends JsonObject
                      ? Struct
                      : T extends Record<string, infer Value>
                        ? Partial<Record<string, Compat<Value>>>
                        : T;

/** Keys whose value is a buf oneof group, recognised by the `{ case, value }` discriminator. */
type OneofKeys<T> = {
  [Key in keyof T]-?: NonNullable<T[Key]> extends { readonly case: string | undefined } ? Key : never;
}[keyof T];

/** Message keys that survive to the compat shape verbatim, minus buf's own metadata. */
type PlainKeys<T> = Exclude<keyof T, OneofKeys<T> | '$typeName' | '$unknown'>;

type UnionToIntersection<Union> = (Union extends unknown ? (arg: Union) => void : never) extends (
  arg: infer Intersection,
) => void
  ? Intersection
  : never;

/** One oneof group, flattened to the optional sibling fields protobuf.js emits. */
type FlattenOneof<Group> = UnionToIntersection<
  NonNullable<Group> extends infer Member
    ? Member extends { readonly case: infer Case extends string; readonly value: infer Value }
      ? { [Key in Case]?: Compat<Value> }
      : Record<never, never>
    : never
>;

/**
 * Keys whose value is a repeated or map field. protobuf.js leaves both optional and buf does not,
 * since buf always materialises the empty collection.
 */
type LooseKeys<T> = {
  [Key in keyof T]-?: NonNullable<T[Key]> extends readonly unknown[]
    ? Key
    : string extends keyof NonNullable<T[Key]>
      ? Key
      : never;
}[keyof T];

type CompatMessage<T> = { [Key in keyof Pick<T, Exclude<PlainKeys<T>, LooseKeys<T>>>]: Compat<T[Key]> } & {
  [Key in keyof Pick<T, Extract<PlainKeys<T>, LooseKeys<T>>>]?: Compat<T[Key]>;
} & UnionToIntersection<{ [Key in OneofKeys<T>]: FlattenOneof<T[Key]> }[OneofKeys<T>]>;
