//
// Copyright 2025 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

// TODO(burdon): Better place for these defs?
export type PreviewProps<T extends object> = PropsWithChildren<
  ThemedClassName<{
    subject: T;
    role: string;
  }>
>;
