//
// Copyright 2020 DXOS.org
//

import Bridge from 'crx-bridge';

import { DevtoolsContext } from '@dxos/client';

export interface HandlerProps {
  hook: DevtoolsContext,
  bridge: typeof Bridge
}
