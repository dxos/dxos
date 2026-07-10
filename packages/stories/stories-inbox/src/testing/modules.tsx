//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type FC } from 'react';

import { ActivationEvents, Capabilities, Capability, Plugin, Role } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { DXN } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';

import { ConnectorModule, ControlsModule, FactsModule, MailboxModule, MessageModule } from '../components';

/**
 * Resolves the active space at the surface boundary and mounts the module with it, so module bodies
 * never call hooks conditionally — mirrors the `useActiveSpace()` pattern used by plugin surfaces.
 */
const withActiveSpace = (Component: FC<{ space: Space }>) => (): React.ReactNode => {
  const space = useActiveSpace();
  return space ? <Component space={space} /> : null;
};

/**
 * Role tokens for the MailboxSync story columns. Each module is contributed as a dedicated
 * `Capabilities.ReactSurface` under its own role NSID (role-only dispatch), so a story layout is a
 * plain grid of these tokens and each surface resolves the active space via `useActiveSpace()`.
 */
export const Module = {
  Controls: Role.make<Record<string, any>>('org.dxos.storybook.inbox.controls'),
  Mailbox: Role.make<Record<string, any>>('org.dxos.storybook.inbox.mailbox'),
  Message: Role.make<Record<string, any>>('org.dxos.storybook.inbox.message'),
  Facts: Role.make<Record<string, any>>('org.dxos.storybook.inbox.facts'),
  Connector: Role.make<Record<string, any>>('org.dxos.storybook.inbox.connector'),
};

/** React surfaces for the MailboxSync story columns, one per `Module` role token. */
const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'inbox.controls',
    filter: Surface.makeFilter(Module.Controls),
    component: withActiveSpace(ControlsModule),
  }),
  Surface.create({
    id: 'inbox.mailbox',
    filter: Surface.makeFilter(Module.Mailbox),
    component: withActiveSpace(MailboxModule),
  }),
  Surface.create({
    id: 'inbox.message',
    filter: Surface.makeFilter(Module.Message),
    component: withActiveSpace(MessageModule),
  }),
  Surface.create({
    id: 'inbox.facts',
    filter: Surface.makeFilter(Module.Facts),
    component: withActiveSpace(FactsModule),
  }),
  Surface.create({
    id: 'inbox.connector',
    filter: Surface.makeFilter(Module.Connector),
    component: withActiveSpace(ConnectorModule),
  }),
];

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
