//
// GENERATED — do not edit
// AST-sliced from src/capabilities/index.ts for the 'node' environment.
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});

export const AppGraphBuilder = undefined;
export const AutomationTemplates = undefined;
export const ContactExtractor = undefined;
export const IdentitySpecs = undefined;
export const InboxSettings = undefined;
export const MailboxProcessors = undefined;
export const NavigationTargetResolver = undefined;
export const ReactSurface = undefined;
export const Schema = undefined;
export const SummarizeExtractor = undefined;
