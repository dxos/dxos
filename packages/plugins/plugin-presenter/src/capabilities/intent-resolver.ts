//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  createResolver,
  LayoutAction,
  type PluginsContext,
} from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { PresenterCapabilities } from './capabilities';
import { PresenterAction } from '../types';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: PresenterAction.TogglePresentation,
      resolve: ({ object, state: next }) => {
        const state = context.requestCapability(PresenterCapabilities.MutableState);
        state.presenting = next ?? !state.presenting;
        if (state.presenting) {
          return {
            intents: [
              createIntent(LayoutAction.SetLayoutMode, {
                part: 'mode',
                subject: fullyQualifiedId(object),
                options: { mode: 'fullscreen' },
              }),
            ],
          };
        } else {
          return {
            intents: [createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { revert: true } })],
          };
        }
      },
    }),
  );
