//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  contributes,
  createIntent,
  createResolver,
} from '@dxos/app-framework';

import { MobileLayoutState } from './state';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateSidebar.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateSidebar.fields.input> =>
        Schema.is(LayoutAction.UpdateSidebar.fields.input)(data),
      resolve: () => {
        // No-op.
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateComplementary.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateComplementary.fields.input> =>
        Schema.is(LayoutAction.UpdateComplementary.fields.input)(data),
      resolve: () => {
        // No-op.
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateDialog.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateDialog.fields.input> =>
        Schema.is(LayoutAction.UpdateDialog.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.getCapability(MobileLayoutState);
        layout.dialogOpen = options.state ?? Boolean(subject);
        layout.dialogType = options.type ?? 'default';
        layout.dialogBlockAlign = options.blockAlign ?? 'center';
        layout.dialogOverlayClasses = options.overlayClasses;
        layout.dialogOverlayStyle = options.overlayStyle;
        layout.dialogContent = subject ? { component: subject, props: options.props } : null;
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdatePopover.fields.input> =>
        Schema.is(LayoutAction.UpdatePopover.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.getCapability(MobileLayoutState);
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
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.SwitchWorkspace.fields.input> =>
        Schema.is(LayoutAction.SwitchWorkspace.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.getCapability(MobileLayoutState);
        // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
        //  Ideally this should be worked into the data model in a generic way.
        if (!layout.workspace.startsWith('!')) {
          layout.previousWorkspace = layout.workspace;
        }
        layout.workspace = subject;
        layout.active = undefined;
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.RevertWorkspace.fields.input> =>
        Schema.is(LayoutAction.RevertWorkspace.fields.input)(data),
      resolve: () => {
        const layout = context.getCapability(MobileLayoutState);
        return {
          intents: [
            createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: layout.previousWorkspace }),
          ],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.Open.fields.input> =>
        Schema.is(LayoutAction.Open.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.getCapability(MobileLayoutState);
        layout.active = subject[0];
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.Close.fields.input> =>
        Schema.is(LayoutAction.Close.fields.input)(data),
      resolve: () => {
        const layout = context.getCapability(MobileLayoutState);
        layout.active = undefined;
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.Set.fields.input> =>
        Schema.is(LayoutAction.Set.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.getCapability(MobileLayoutState);
        layout.active = subject[0];
      },
    }),
  ]);
