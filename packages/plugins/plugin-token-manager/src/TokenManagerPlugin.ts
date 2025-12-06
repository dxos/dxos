//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  Events,
  LayoutAction,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
} from '@dxos/app-framework';
import { parseId } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { AccessToken } from '@dxos/types';

import { AppGraphBuilder, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const TokenManagerPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [AccessToken.AccessToken]),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  // TODO(wittjosiah): This sort of this could motivate introducing a router.
  defineModule({
    id: `${meta.id}/module/oauth-redirect`,
    activatesOn: Events.Startup,
    activate: async (context) => {
      // Grab the url on startup and check if we have an access token.
      const url = new URL(window.location.href);
      log('startup url', { url: url.toString() });
      const accessTokenId = url.searchParams.get('accessTokenId');
      const accessToken = url.searchParams.get('accessToken');
      // If the path is an oauth-redirect and we have an access token, attempt to store it.
      if (url.pathname === '/redirect/oauth' && accessTokenId && accessToken) {
        log('oauth redirect', { url, accessTokenId, accessToken });

        // Clear access token from url.
        url.searchParams.delete('accessTokenId');
        url.searchParams.delete('accessToken');
        window.history.replaceState(null, '', url);

        // Queue micro task to allow startup to continue.
        queueMicrotask(async () => {
          // Wait for capabilities here rather than on startup event to ensure the intial url is captured.
          const { dispatchPromise: dispatch } = await context.waitForCapability(Capabilities.IntentDispatcher);
          const client = await context.waitForCapability(ClientCapabilities.Client);

          // Look for matching access token in local storage and add to space.
          const { spaceId: rawId, object: rawObject } = JSON.parse(localStorage.getItem(accessTokenId) ?? '{}');
          log('found token', { spaceId: rawId, object: rawObject });
          localStorage.removeItem(accessTokenId);
          const { spaceId } = parseId(rawId);
          if (spaceId) {
            const space = client.spaces.get(spaceId);
            await space?.waitUntilReady();
            log('found space', { spaceId, space: !!space });
            const object = AccessToken.make({ ...rawObject, token: accessToken });
            space?.db.add(object);
            log('added token', { spaceId, object });
            await context.waitForCapability(Capabilities.Layout);
            await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: spaceId }));
          } else {
            await client.spaces.waitUntilReady();
            await context.waitForCapability(Capabilities.Layout);
            await dispatch(
              createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: client.spaces.default.id }),
            );
          }
        });
      }

      return contributes(Capabilities.Null, null);
    },
  }),
]);
