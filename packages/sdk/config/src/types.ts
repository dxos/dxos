import type { Config as ConfigObject } from "./proto/gen/dxos/config";

export type { ConfigObject };


type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`

/**
 * Returns all dot-separated nested keys for an object.  
 */
type DotNestedKeys<T> = (
  T extends object
    ? {
      [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}`
    }[Exclude<keyof T, symbol>]
    : ""
  ) extends infer D ? Extract<D, string> : never;

export type ParseKey<K extends string> = 
    K extends `${infer L}.${infer Rest}` ? [L, ...ParseKey<Rest>]
    : [K]

type Keys = (keyof any)[]

export type DeepIndex<T, KS extends Keys, Fail = undefined> =
  KS extends [infer F, ...infer R] ? F extends keyof Exclude<T, undefined> ? R extends Keys ?
  DeepIndex<Exclude<T, undefined>[F], R, Fail> : Fail : Fail : T;

export type ConfigKey = DotNestedKeys<ConfigObject> 

