//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { ContactMessageExtractor, SummarizeMessageExtractor } from '#operations';

import * as InboxCapabilities from '../types/InboxCapabilities';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const IdentitySpecs = Capability.lazyModule(
  'IdentitySpecs',
  { provides: [SpaceCapabilities.IdentitySpec] },
  () => import('./identity-specs'),
);
export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorSpec.Connector] },
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
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const InboxSettings = AppCapability.settings(() => import('./settings'), {
  provides: [InboxCapabilities.Settings],
});
