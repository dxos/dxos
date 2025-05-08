//
// Copyright 2025 DXOS.org
//

//
// Typesafe versions of common utils
//

export const keys = <K extends keyof any>(obj: Record<K, any>): K[] => Object.keys(obj) as K[];

export const entries = <K extends keyof any, V>(obj: Record<K, V>): [K, V][] => Object.entries(obj) as [K, V][];
