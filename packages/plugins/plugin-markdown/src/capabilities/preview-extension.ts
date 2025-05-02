//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, LayoutAction, type PluginsContext } from '@dxos/app-framework';
import { addEventListener } from '@dxos/async';
import { type Client } from '@dxos/client';
import { DXN } from '@dxos/keys';
import { type DxRefTagActivate } from '@dxos/lit-ui';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { resolveRef } from '@dxos/react-client';
import { parseId, type Space } from '@dxos/react-client/echo';
import { preview, type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/react-ui-editor';

import { MarkdownCapabilities } from './capabilities';

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

// TODO(wittjosiah): Factor out and make not ECHO-specific.
export default (context: PluginsContext) => {
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

  if (document.defaultView) {
    addEventListener(document.defaultView, 'dx-ref-tag-activate', handleDxRefTagActivate, customEventOptions);
  } else {
    log.warn('No default view found');
  }

  return contributes(MarkdownCapabilities.Extensions, [() => preview()]);
};
