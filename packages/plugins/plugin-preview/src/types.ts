//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import { type PropsWithChildren } from 'react';

export type PreviewProps<T extends Schema.Schema.Type<any>> = PropsWithChildren<{
  subject: T;
  role?: string;
}>;
