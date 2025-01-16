//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  createResolver,
  LayoutAction,
  NavigationAction,
  type PluginsContext,
} from '@dxos/app-framework';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { PresenterCapabilities } from './capabilities';
import { PresenterAction } from '../types';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(PresenterAction.TogglePresentation, ({ object, state: next }) => {
      const state = context.requestCapability(PresenterCapabilities.MutableState);
      state.presenting = next ?? !state.presenting;

      if (state.presenting) {
        return {
          intents: [
            createIntent(LayoutAction.SetLayoutMode, { layoutMode: 'fullscreen' }),
            createIntent(NavigationAction.Open, { activeParts: { fullScreen: fullyQualifiedId(object) } }),
          ],
        };
      } else {
        return {
          intents: [
            createIntent(LayoutAction.SetLayoutMode, { revert: true }),
            createIntent(NavigationAction.Close, { activeParts: { fullScreen: fullyQualifiedId(object) } }),
          ],
        };
      }
    }),
  );
