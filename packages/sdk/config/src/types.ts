//
// Copyright 2021 DXOS.org
//

import { Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';
import { MaybeFunction, MaybePromise } from '@dxos/util';

import { Config } from './config.js';

export type ConfigProvider = MaybeFunction<MaybePromise<Config | ConfigProto>>

export const FILE_DEFAULTS = 'defaults.yml';
export const FILE_ENVS = 'envs-map.yml';
export const FILE_DYNAMICS = 'config.yml';

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`

/**
 * Returns all dot-separated nested keys for an object.
 *
 * Read more: https://stackoverflow.com/a/68404823.
 */
type DotNestedKeys<T> = (
  T extends object
    ? {
      [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}`
    }[Exclude<keyof T, symbol>]
    : ''
  ) extends infer D ? Extract<D, string> : never;

/**
 * Parse a dot separated nested key into an array of keys.
 *
 * Example: 'services.signal.server' -> ['services', 'signal', 'server'].
 */
export type ParseKey<K extends string> = K extends `${infer L}.${infer Rest}` ? [L, ...ParseKey<Rest>] : [K]

/**
 * Array of types that can act as an object key.
 */
type Keys = (keyof any)[]

/**
 * Retrieves a property type in a series of nested objects.
 *
 * Read more: https://stackoverflow.com/a/61648690.
 */
export type DeepIndex<T, KS extends Keys, Fail = undefined> =
  KS extends [infer F, ...infer R] ? F extends keyof Exclude<T, undefined> ? R extends Keys ?
  DeepIndex<Exclude<T, undefined>[F], R, Fail> : Fail : Fail : T;

/**
 * Any nested dot separated key that can be in config.
 */
// TODO(egorgripasov): Clean once old config deprecated.
export type ConfigKey = DotNestedKeys<ConfigProto>
