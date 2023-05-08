//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

// TODO(burdon): State.
export type Plugin = {
  id: string;
  state: any;
  components: Record<string, FC>;
};
