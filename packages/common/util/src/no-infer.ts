//
// Copyright 2024 DXOS.org
//

export type NoInfer<A> = [A][A extends any ? 0 : never];
