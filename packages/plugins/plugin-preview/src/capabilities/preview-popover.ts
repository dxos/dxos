//
// Copyright 2025 DXOS.org
//

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { addEventListener } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space, parseId } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { DX_ANCHOR_ACTIVATE, type DxAnchorActivate } from '@dxos/react-ui';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/react-ui-editor';

const customEventOptions = { capture: true, passive: false };

const handlePreviewLookup = async (
  client: Client,
  defaultSpace: Space,
  { ref, label }: PreviewLinkRef,
): Promise<PreviewLinkTarget | null> => {
  try {
    const object = await defaultSpace.db.ref(DXN.parse(ref)).load();
    return { label, object };
  } catch {
    return null;
  }
};

export default (context: PluginContext) => {
  // TODO(wittjosiah): Factor out lookup handlers to other plugins to make not ECHO-specific.
  const handleDxAnchorActivate = async ({ refId, label, trigger }: DxAnchorActivate) => {
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
      DX_ANCHOR_ACTIVATE as any,
      handleDxAnchorActivate,
      customEventOptions,
    );
  } else {
    log.warn('No default view found');
  }

  return contributes(Capabilities.Null, null, () => cleanup());
};
