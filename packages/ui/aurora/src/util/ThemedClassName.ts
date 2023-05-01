//
// Copyright 2023 DXOS.org
//

export type ThemedClassName<P> = Omit<P, 'className'> & { className?: string | string[] };
