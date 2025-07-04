//
// Copyright 2025 DXOS.org
//

import { type PropsWithChildren } from 'react';

// TODO(burdon): Better place for these defs?
export type PreviewProps<T extends object> = PropsWithChildren<{
  subject: T;
  role?: string;
}>;
