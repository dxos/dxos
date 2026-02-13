//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { addEventListener } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space, parseId } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
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

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    // TODO(wittjosiah): Factor out lookup handlers to other plugins to make not ECHO-specific.
    const handleAnchorActivate = async ({
      refId,
      label,
      trigger,
      kind = 'card',
      title: titleProp,
      side,
      props,
    }: DxAnchorActivate) => {
      const { invokePromise } = capabilities.get(Common.Capability.OperationInvoker);
      const client = capabilities.get(ClientCapabilities.Client);
      const registry = capabilities.get(Common.Capability.AtomRegistry);
      const [layoutAtom] = capabilities.getAll(Common.Capability.Layout);
      const layout = registry.get(layoutAtom);
      const { spaceId } = parseId(layout.workspace);
      const space = (spaceId && client.spaces.get(spaceId)) ?? client.spaces.default;
      const result = await handlePreviewLookup(client, space, { ref: refId, label });
      if (!result) {
        return;
      }

      const title = titleProp ?? Obj.getLabel(result.object);

      await invokePromise(Common.LayoutOperation.UpdatePopover, {
        refId,
        subject: result.object,
        state: true,
        variant: 'virtual',
        anchor: trigger,
        ...(kind && { kind }),
        ...(title && { title }),
        ...(side && { side }),
        ...(props && { props }),
      });
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
      log.warn('no default view found');
    }

    return Capability.contributes(Common.Capability.Null, null, () => Effect.sync(() => cleanup?.()));
  }),
);
