//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';

import { ThreadCapabilities } from './capabilities';
import { threads } from '../extensions';

export default (context: PluginContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document: doc }) => {
      const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
      const { state } = context.getCapability(ThreadCapabilities.MutableState);
      return threads(state, doc, dispatch);
    },
  ]);
