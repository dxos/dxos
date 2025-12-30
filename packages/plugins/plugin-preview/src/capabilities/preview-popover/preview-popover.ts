//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent } from '@dxos/app-framework';

import { addEventListener } from '@dxos/async';

import { type Client } from '@dxos/client';

import { type Space, parseId } from '@dxos/client/echo';

import { DXN } from '@dxos/keys';

import { log } from '@dxos/log';

import { ClientCapabilities } from '@dxos/plugin-client';

import { DX_ANCHOR_ACTIVATE, type DxAnchorActivate } from '@dxos/react-ui';

import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-editor';

const customEventOptions = { capture: true, passive: false };

const handlePreviewLookup = async (
  client: Client,
  defaultSpace: Space,
  { ref, label }: PreviewLinkRef,
): Promise<PreviewLinkTarget | null> => {
  try {
    const object = await defaultSpace.db.makeRef(DXN.parse(ref)).load();
    return { label, object };
  } catch {
    return null;
  }
};

export default Capability.makeModule((context) =>
  Effect.sync(() => {
  // TODO(wittjosiah): Factor out lookup handlers to other plugins to make not ECHO-specific.
  const handleAnchorActivate = async ({ refId, label, trigger }: DxAnchorActivate) => {
    const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
    const client = context.getCapability(ClientCapabilities.Client);
    const [layout] = context.getCapabilities(Common.Capability.Layout);
    const { spaceId } = parseId(layout.workspace);
    const space = (spaceId && client.spaces.get(spaceId)) ?? client.spaces.default;
    const result = await handlePreviewLookup(client, space, { ref: refId, label });
    if (!result) {
      return;
    }

    await dispatch(
      createIntent(Common.LayoutAction.UpdatePopover, {
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
      handleAnchorActivate,
      customEventOptions,
    );
  } else {
    log.warn('No default view found');
  }

  return Capability.contributes(Common.Capability.Null, null, () => Effect.sync(() => cleanup?.()));
  }),
);
