//
// Copyright 2021 DXOS.org
//

import { type JsonObject, type MessageInitShape } from '@bufbuild/protobuf';

import { type Config as ConfigProto, type ConfigSchema } from '@dxos/protocols/buf/dxos/config_pb';

export const FILE_DEFAULTS = 'defaults.yml';
export const FILE_ENVS = 'envs-map.yml';
export const FILE_DYNAMICS = 'config.yml';

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

/**
 * Returns all dot-separated nested keys for an object.
 *
 * Read more: https://stackoverflow.com/a/68404823.
 */
// Repeated fields are leaves: a config key addresses the list itself, never an index into it.
type DotNestedKeys<T> = (
  T extends readonly any[]
    ? ''
    : T extends object
      ? {
          [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}`;
        }[Exclude<keyof T, symbol>]
      : ''
) extends infer D
  ? Extract<D, string>
  : never;

/**
 * Parse a dot separated nested key into an array of keys.
 *
 * Example: 'services.signal.server' -> ['services', 'signal', 'server'].
 */
export type ParseKey<K extends string> = K extends `${infer L}.${infer Rest}` ? [L, ...ParseKey<Rest>] : [K];

/**
 * Array of types that can act as an object key.
 */
type Keys = (keyof any)[];

/**
 * Retrieves a property type in a series of nested objects.
 *
 * Read more: https://stackoverflow.com/a/61648690.
 */
export type DeepIndex<T, KS extends Keys, Fail = undefined> = KS extends [infer F, ...infer R]
  ? F extends keyof Exclude<T, undefined>
    ? R extends Keys
      ? DeepIndex<Exclude<T, undefined>[F], R, Fail>
      : Fail
    : Fail
  : T;

/** Plain object accepted wherever a config is supplied -- a loaded YAML file, a test literal. */
export type ConfigInit = MessageInitShape<typeof ConfigSchema>;

// buf's bookkeeping fields are dropped before walking the tree: `$typeName` is a string literal
// and `$unknown` a list of wire records, neither of which is addressable by a config key.
type ConfigFields<T> = T extends readonly (infer Element)[]
  ? ConfigFields<Element>[]
  : T extends JsonObject
    ? Record<string, any>
    : {
        [Key in keyof T as Key extends '$typeName' | '$unknown' ? never : Key]: ConfigFields<T[Key]>;
      };

/**
 * Any nested dot separated key that can be in config.
 */
// TODO(egorgripasov): Clean once old config deprecated.
export type ConfigKey = DotNestedKeys<ConfigFields<ConfigProto>>;
