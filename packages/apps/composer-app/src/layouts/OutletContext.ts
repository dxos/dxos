//
// Copyright 2023 DXOS.org
//

import { Document } from '@braneframe/types';
import { Space } from '@dxos/client';

export type OutletContext = {
  space?: Space;
  document?: Document;
  layout: 'standalone' | 'embedded';
};
