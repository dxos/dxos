//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppSpace, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { addEventListener } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type DxAnchorActivate, DX_ANCHOR_ACTIVATE } from '@dxos/react-ui';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-editor';

const customEventOptions = { capture: true, passive: false };

const handlePreviewLookup = async (
  client: Client,
  defaultSpace: Space,
  { dxn, label }: PreviewLinkRef,
): Promise<PreviewLinkTarget | null> => {
  try {
    const object = await defaultSpace.db.makeRef(EID.parse(dxn)).load();
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
    // Monotonic activation token: each invocation captures its own sequence; only the
    // most recent activation is allowed to commit popover state. Prevents a slow
    // open (async lookup) from clobbering a later close that fires while it's in flight.
    let activationSequence = 0;
    const handleAnchorActivate = async ({
      dxn,
      label,
      trigger,
      kind = 'card',
      title: titleProp,
      side,
      props,
      state,
    }: DxAnchorActivate) => {
      const sequence = ++activationSequence;
      const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);

      // Explicit close: callers pass `state: false` on pointer-leave to dismiss
      // the popover. Operation schema requires anchor + kind, so use placeholders;
      // they're overwritten in ephemeral state but only `state` is read by the UI.
      if (state === false) {
        await invokePromise(LayoutOperation.UpdatePopover, {
          variant: 'virtual',
          anchor: trigger,
          kind: 'base',
          state: false,
        });
        return;
      }

      const client = capabilities.get(ClientCapabilities.Client);
      const registry = capabilities.get(Capabilities.AtomRegistry);
      // Layout is optional: in standalone harnesses (Storybook, tests) no plugin contributes
      // `AppCapabilities.Layout`, and `getAll` returns an empty array. Reading `registry.get(undefined)`
      // would crash inside Atom's identity check (`'~atom/Serializable' in undefined`). When layout
      // isn't available, fall through to the personal-space default.
      const [layoutAtom] = capabilities.getAll(AppCapabilities.Layout);
      const spaceId = layoutAtom && Paths.getSpaceIdFromPath(registry.get(layoutAtom).workspace);
      const space = (spaceId && client.spaces.get(spaceId)) ?? AppSpace.getPersonalSpace(client);
      if (!space) {
        return;
      }
      const result = await handlePreviewLookup(client, space, { dxn, label });
      if (!result) {
        return;
      }
      // A newer activation (open or close) arrived while the lookup was in flight; bail
      // out so we don't clobber the latest state.
      if (sequence !== activationSequence) {
        return;
      }

      const title = titleProp ?? Obj.getLabel(result.object, { fallback: 'typename' });

      await invokePromise(LayoutOperation.UpdatePopover, {
        subjectRef: dxn,
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

    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => cleanup?.()));
  }),
);
