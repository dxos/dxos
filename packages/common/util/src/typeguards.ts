//
// Copyright 2021 DXOS.org
//

export const boolGuard = <T>(value: T | null | undefined): value is T => Boolean(value);
