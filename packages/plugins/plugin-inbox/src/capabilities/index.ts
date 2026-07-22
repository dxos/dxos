//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { SpaceCapability } from '@dxos/plugin-space';

import { ContactMessageExtractor, SummarizeMessageExtractor } from '#operations';
import { InboxCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState, ClientCapabilities.Client],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const ContactExtractor = Capability.inlineModule(
  'contact-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () => Effect.succeed([Capability.contribute(InboxCapabilities.ObjectExtractor, ContactMessageExtractor)]),
);
export const SummarizeExtractor = Capability.inlineModule(
  'summarize-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () => Effect.succeed([Capability.contribute(InboxCapabilities.ObjectExtractor, SummarizeMessageExtractor)]),
);
export const NavigationResolver = AppCapability.navigationResolver(() => import('./navigation-resolver'), {
  requires: [ClientCapabilities.Client],
  provides: [AppCapabilities.NavigationPathResolver],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const InboxSettings = AppCapability.settings(() => import('./settings'), {
  provides: [InboxCapabilities.Settings],
});
