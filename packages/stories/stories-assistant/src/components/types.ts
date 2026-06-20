//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';

export type ModuleProps = {
  space: Space;
  debug?: boolean;
  onEvent?: (event: string) => void;
};
