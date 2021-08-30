//
// Copyright 2021 DXOS.org
//

export type Awaited<T> = T extends Promise<infer U> ? U : T;
