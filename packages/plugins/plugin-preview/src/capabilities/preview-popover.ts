//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { addEventListener } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { DX_ANCHOR_ACTIVATE, type DxAnchorActivate } from '@dxos/react-ui';
import { type PreviewLinkRef, type PreviewLinkTarget } from '@dxos/ui-types';

import { PreviewCapabilities } from '#types';

const customEventOptions = { capture: true, passive: false };

/** The first resolver's answer, asked in contribution order; a resolver declines by answering undefined. */
const resolveLink = (
  resolvers: PreviewCapabilities.PreviewLinkResolver[],
  ref: PreviewLinkRef,
  context: PreviewCapabilities.PreviewLinkContext,
): Effect.Effect<PreviewLinkTarget | undefined> =>
  Effect.gen(function* () {
    for (const resolve of resolvers) {
      const target = yield* resolve(ref, context);
      if (target) {
        return target;
      }
    }
    return undefined;
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    // Monotonic activation token: each invocation captures its own sequence; only the
    // most recent activation is allowed to commit popover state. Prevents a slow
    // open (async lookup) from clobbering a later close that fires while it's in flight.
    let activationSequence = 0;
    // The anchor whose card is showing: a close arrives after the anchor's grace period, by which
    // time the pointer may have opened another anchor, and only the shown anchor may close it.
    let activeTrigger: HTMLElement | undefined;
    const handleAnchorActivate = async ({
      eid,
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
        if (trigger !== activeTrigger) {
          return;
        }
        activeTrigger = undefined;
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
      // isn't available, fall through to the default space.
      const [layoutAtom] = capabilities.getAll(AppCapabilities.Layout);
      const spaceId = layoutAtom && GraphPath.getSpaceIdFromPath(registry.get(layoutAtom).workspace);
      const space = (spaceId && client.spaces.get(spaceId)) ?? AppSpace.getDefaultSpace(client);
      const resolvers = capabilities.getAll(PreviewCapabilities.LinkResolver).flat();
      const result = await EffectEx.runPromise(resolveLink(resolvers, { eid, label }, { space }));
      if (!result) {
        return;
      }
      // A newer activation (open or close) arrived while the lookup was in flight; bail
      // out so we don't clobber the latest state.
      if (sequence !== activationSequence) {
        return;
      }

      // Same fallback chain as the graph node label (AppNode.getObjectGraphNodePartials), so an
      // unnamed object shows its per-type placeholder (e.g. "New game") rather than the raw typename.
      const fallbackTitle: [string, { ns: string; defaultValue?: string }] = [
        'object-name.placeholder',
        { ns: Obj.getTypename(result.object) ?? '', defaultValue: 'New item' },
      ];
      const title = titleProp ?? Obj.getLabel(result.object) ?? fallbackTitle;

      activeTrigger = trigger;
      const input = {
        subjectRef: eid,
        subject: result.object,
        state: true,
        variant: 'virtual',
        anchor: trigger,
        ...(side && { side }),
        ...(props && { props }),
      } as const;
      // The union discriminates on `kind`: only the card member carries a title.
      await invokePromise(
        LayoutOperation.UpdatePopover,
        kind === 'card' ? { ...input, kind, title } : { ...input, kind },
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
      log.warn('no default view found');
    }

    yield* Effect.addFinalizer(() => Effect.sync(() => cleanup?.()));
    return [];
  }),
);
