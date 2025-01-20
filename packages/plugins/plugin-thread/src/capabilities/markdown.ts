//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';

import { ThreadCapabilities } from './capabilities';
import { threads } from '../extensions';

export default (context: PluginsContext) =>
  contributes(MarkdownCapabilities.Extensions, [
    ({ document: doc }) => {
      const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
      const { state } = context.requestCapability(ThreadCapabilities.MutableState);
      return threads(state, doc, dispatch);
    },
  ]);
