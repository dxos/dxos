//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import { moduleSurfaces } from '../modules';

/** Contributes the MailboxSync module surfaces so a story can drive them from a `ModuleContainer` layout. */
export const StoryModulesPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.modules'),
    name: 'Mailbox Sync Story Modules',
  }),
).pipe(
  Plugin.addModule({
    id: 'inbox-story-modules',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => Effect.succeed(Capability.contributes(Capabilities.ReactSurface, moduleSurfaces)),
  }),
  Plugin.make,
);
