//
// Copyright 2025 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { type Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

export type PreviewProps<T extends Obj.Any = Obj.Any> = PropsWithChildren<{
  subject: T;
  role?: string;
  activeSpace?: Space;
  onSelect?: (obj: Obj.Any) => void;
}>;
