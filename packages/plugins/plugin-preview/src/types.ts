//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import { type PropsWithChildren } from 'react';

import { type Space } from '@dxos/react-client/echo';

export type PreviewProps<T extends Schema.Schema.Type<any>> = PropsWithChildren<{
  subject: T;
  role?: string;
  activeSpace?: Space;
}>;
