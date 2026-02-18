//
// Copyright 2025 DXOS.org
//

import { type Context, createContext } from 'react';

import { type Props } from './types';

export type SurfaceContext = Pick<Props, 'id' | 'role' | 'data'>;

// TODO(burdon): Use @radix-ui/react-context
export const SurfaceContext: Context<SurfaceContext | undefined> = createContext<SurfaceContext | undefined>(undefined);
