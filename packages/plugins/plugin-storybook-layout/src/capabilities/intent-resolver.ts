//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability, Common, createResolver } from '@dxos/app-framework';

import { LayoutState } from './state';

export default Capability.makeModule((context) =>
  Capability.contributes(Common.Capability.IntentResolver, [
    createResolver({
      intent: Common.LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateSidebar.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof Common.LayoutAction.UpdateSidebar.fields.input> =>
        Schema.is(Common.LayoutAction.UpdateSidebar.fields.input)(data),
      resolve: ({ options }) => {
        const layout = context.getCapability(LayoutState);
        const next = options?.state ?? layout.sidebarState;
        if (next !== layout.sidebarState) {
          layout.sidebarState = next;
        }
      },
    }),
    createResolver({
      intent: Common.LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateComplementary.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof Common.LayoutAction.UpdateComplementary.fields.input> =>
        Schema.is(Common.LayoutAction.UpdateComplementary.fields.input)(data),
      resolve: ({ options }) => {
        const layout = context.getCapability(LayoutState);
        const next = options?.state ?? layout.complementarySidebarState;
        if (next !== layout.complementarySidebarState) {
          layout.complementarySidebarState = next;
        }
      },
    }),
    createResolver({
      intent: Common.LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateDialog.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof Common.LayoutAction.UpdateDialog.fields.input> =>
        Schema.is(Common.LayoutAction.UpdateDialog.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.getCapability(LayoutState);
        layout.dialogOpen = options.state ?? Boolean(subject);
        layout.dialogType = options.type ?? 'default';
        layout.dialogBlockAlign = options.blockAlign ?? 'center';
        layout.dialogOverlayClasses = options.overlayClasses;
        layout.dialogOverlayStyle = options.overlayStyle;
        layout.dialogContent = subject ? { component: subject, props: options.props } : null;
      },
    }),
    createResolver({
      intent: Common.LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof Common.LayoutAction.UpdatePopover.fields.input> =>
        Schema.is(Common.LayoutAction.UpdatePopover.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.getCapability(LayoutState);
        layout.popoverContent =
          typeof subject === 'string'
            ? { component: subject, props: options.props }
            : subject
              ? { subject }
              : undefined;
        layout.popoverOpen = options.state ?? Boolean(subject);
        layout.popoverSide = options.side;
        layout.popoverVariant = options.variant;
        if (options.variant === 'virtual') {
          layout.popoverAnchor = options.anchor;
        } else {
          layout.popoverAnchorId = options.anchorId;
        }
      },
    }),
    createResolver({
      intent: Common.LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof Common.LayoutAction.SwitchWorkspace.fields.input> =>
        Schema.is(Common.LayoutAction.SwitchWorkspace.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.getCapability(LayoutState);
        layout.workspace = subject;
      },
    }),
  ]),
);
