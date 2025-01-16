//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { CanvasBoardType, CanvasAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(CanvasAction.Create, ({ name }) => ({
      data: { object: create(CanvasBoardType, { name, layout: { shapes: [] } }) },
    })),
  );
