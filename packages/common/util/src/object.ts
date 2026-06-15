//
// Copyright 2025 DXOS.org
//

/**
 * @deprecated Use `Struct.keys` from effect.
 */
export const keys = <R>(obj: R): (keyof R)[] => Object.keys(obj as any) as (keyof R)[];

export const entries = <R>(obj: R): [keyof R, R[keyof R]][] => Object.entries(obj as any) as [keyof R, any][];
