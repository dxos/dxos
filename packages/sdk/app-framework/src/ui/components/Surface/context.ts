//
// Copyright 2025 DXOS.org
//

import { type Context, createContext } from 'react';

export type SurfaceContext = {
  id?: string;
  /** The resolved role NSID (e.g. `org.dxos.role.article`). */
  role: string;
  data?: Record<string, any>;
};

export const SurfaceContext: Context<SurfaceContext | undefined> = createContext<SurfaceContext | undefined>(undefined);
