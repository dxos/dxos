//
// Copyright 2025 DXOS.org
//

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { addEventListener } from '@dxos/async';
import { type Client, resolveRef } from '@dxos/client';
import { type Space, parseId } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';
import { type DxRefTagActivate } from '@dxos/lit-ui';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/react-ui-editor';

const customEventOptions = { capture: true, passive: false };

const handlePreviewLookup = async (
  client: Client,
  defaultSpace: Space,
  { ref, label }: PreviewLinkRef,
): Promise<PreviewLinkTarget | null> => {
  try {
    const dxn = DXN.parse(ref);
    if (!dxn) {
      return null;
    }

    const object = await resolveRef(client, dxn, defaultSpace);
    return { label, object };
  } catch (err) {
    return null;
  }
};

export default (context: PluginContext) => {
  // TODO(wittjosiah): Factor out lookup handlers to other plugins to make not ECHO-specific.
  const handleDxRefTagActivate = async ({ refId, label, trigger }: DxRefTagActivate) => {
    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
    const client = context.getCapability(ClientCapabilities.Client);
    const [layout] = context.getCapabilities(Capabilities.Layout);
    const { spaceId } = parseId(layout.workspace);
    const space = (spaceId && client.spaces.get(spaceId)) ?? client.spaces.default;
    const result = await handlePreviewLookup(client, space, { ref: refId, label });
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

  let cleanup: () => void;
  if (document.defaultView) {
    cleanup = addEventListener(
      document.defaultView,
      'dx-ref-tag-activate' as any,
      handleDxRefTagActivate,
      customEventOptions,
    );
  } else {
    log.warn('No default view found');
  }

  return contributes(Capabilities.Null, null, () => cleanup());
};
