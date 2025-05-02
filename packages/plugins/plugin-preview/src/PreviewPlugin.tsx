//
// Copyright 2023 DXOS.org
//

import {
  createIntent,
  Capabilities,
  contributes,
  Events,
  defineModule,
  definePlugin,
  LayoutAction,
} from '@dxos/app-framework';
import { addEventListener } from '@dxos/async';
import { type Client } from '@dxos/client';
import { resolveRef } from '@dxos/client';
import { parseId, type Space } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';
import { type DxRefTagActivate } from '@dxos/lit-ui';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/react-ui-editor';

import { meta } from './meta';

const customEventOptions = { capture: true, passive: false };

const handlePreviewLookup = async (
  client: Client,
  defaultSpace: Space,
  { ref, label }: PreviewLinkRef,
): Promise<PreviewLinkTarget | null> => {
  const dxn = DXN.parse(ref);
  if (!dxn) {
    return null;
  }

  const object = await resolveRef(client, dxn, defaultSpace);
  return { label, object };
};

export const PreviewPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/preview-popoevr`,
      activatesOn: Events.Startup,
      activate: (context) => {
        // TODO(wittjosiah): Factor out lookup handlers to other plugins to make not ECHO-specific.
        const handleDxRefTagActivate = async ({ ref, label, trigger }: DxRefTagActivate) => {
          const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
          const client = context.requestCapability(ClientCapabilities.Client);
          const [layout] = context.requestCapabilities(Capabilities.Layout);
          const { spaceId } = parseId(layout.workspace);
          const space = (spaceId && client.spaces.get(spaceId)) ?? client.spaces.default;
          const result = await handlePreviewLookup(client, space, { ref, label });
          if (!result) {
            return;
          }

          await dispatch(
            createIntent(LayoutAction.UpdatePopover, {
              part: 'popover',
              subject: result.object,
              options: {
                state: true,
                variant: 'virtual',
                anchor: trigger,
              },
            }),
          );
        };

        if (!document.defaultView) {
          log.warn('No default view found');
          return [];
        }

        const cleanup = addEventListener(
          document.defaultView,
          'dx-ref-tag-activate',
          handleDxRefTagActivate,
          customEventOptions,
        );
        return contributes(Capabilities.Null, null, () => cleanup());
      },
    }),
  ]);
