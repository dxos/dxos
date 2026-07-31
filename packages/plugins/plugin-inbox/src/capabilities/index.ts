//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { SpaceCapability } from '@dxos/plugin-space';

import { ContactMessageExtractor, SummarizeMessageExtractor } from '#operations';
import { InboxCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
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
export const NavigationTargetResolver = AppCapability.navigationResolver(() => import('./navigation-target-resolver'), {
  requires: [ClientCapabilities.Client],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.role.article',
    'org.dxos.role.cardContent',
    'org.dxos.role.objectProperties',
    'org.dxos.role.popover',
    'org.dxos.role.related',
    'org.dxos.role.section',
  ],
});
export const InboxSettings = AppCapability.settings(() => import('./settings'), {
  provides: [InboxCapabilities.Settings],
});
