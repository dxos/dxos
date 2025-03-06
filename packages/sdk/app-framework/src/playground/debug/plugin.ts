//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { defineModule, definePlugin, lazy } from '../../core';

const Debug = lazy(() => import('./Debug'));

export const DebugPlugin = () =>
  definePlugin({ id: 'dxos.org/test/debug' }, [
    defineModule({
      id: 'dxos.org/test/debug/main',
      activatesOn: Events.Startup,
      activate: Debug,
    }),
  ]);
