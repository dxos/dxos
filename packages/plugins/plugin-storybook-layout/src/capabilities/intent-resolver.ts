//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { contributes, Capabilities, createResolver, type PluginsContext, LayoutAction } from '@dxos/app-framework';

import { LayoutState } from './state';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateSidebar.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateSidebar.fields.input> =>
        Schema.is(LayoutAction.UpdateSidebar.fields.input)(data),
      resolve: ({ options }) => {
        const layout = context.requestCapability(LayoutState);
        const next = options?.state ?? layout.sidebarState;
        if (next !== layout.sidebarState) {
          layout.sidebarState = next;
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateComplementary.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateComplementary.fields.input> =>
        Schema.is(LayoutAction.UpdateComplementary.fields.input)(data),
      resolve: ({ options }) => {
        const layout = context.requestCapability(LayoutState);
        const next = options?.state ?? layout.complementarySidebarState;
        if (next !== layout.complementarySidebarState) {
          layout.complementarySidebarState = next;
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdatePopover.fields.input> =>
        Schema.is(LayoutAction.UpdatePopover.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.requestCapability(LayoutState);
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
  ]);
