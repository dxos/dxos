//
// Copyright 2024 DXOS.org
//

import type { HonoRequest } from 'hono';

export const str = (...text: string[]) => text.join(' ');

export const safeJson = async <T>(req: HonoRequest): Promise<T | undefined> => {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
};
