//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability, Plugin, Role } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { DXN } from '@dxos/keys';
import { withModuleProps } from '@dxos/story-modules';

import {
  ArchiveModule,
  ConnectorModule,
  ControlsModule,
  FactsModule,
  MailboxModule,
  MessageModule,
  StatsModule,
  SwarmTraceModule,
  SyncStateModule,
  TopicsModule,
  TraceModule,
  TriggersModule,
} from '../modules';

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
  Topics: Role.make<Record<string, any>>('org.dxos.storybook.inbox.topics'),
  Connector: Role.make<Record<string, any>>('org.dxos.storybook.inbox.connector'),
  Archive: Role.make<Record<string, any>>('org.dxos.storybook.inbox.archive'),
  Stats: Role.make<Record<string, any>>('org.dxos.storybook.inbox.stats'),
  SyncState: Role.make<Record<string, any>>('org.dxos.storybook.inbox.syncState'),
  Trace: Role.make<Record<string, any>>('org.dxos.storybook.inbox.trace'),
  SwarmTrace: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.swarmTrace'),
  Triggers: Role.make<Record<string, any>>('org.dxos.storybook.inbox.triggers'),
};

/** React surfaces for the MailboxSync story columns, one per `Module` role token. */
const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'inbox.controls',
    filter: Surface.makeFilter(Module.Controls),
    component: withModuleProps(ControlsModule),
  }),
  Surface.create({
    id: 'inbox.mailbox',
    filter: Surface.makeFilter(Module.Mailbox),
    component: withModuleProps(MailboxModule),
  }),
  Surface.create({
    id: 'inbox.message',
    filter: Surface.makeFilter(Module.Message),
    component: withModuleProps(MessageModule),
  }),
  Surface.create({
    id: 'inbox.facts',
    filter: Surface.makeFilter(Module.Facts),
    component: withModuleProps(FactsModule),
  }),
  Surface.create({
    id: 'inbox.topics',
    filter: Surface.makeFilter(Module.Topics),
    component: withModuleProps(TopicsModule),
  }),
  Surface.create({
    id: 'inbox.connector',
    filter: Surface.makeFilter(Module.Connector),
    component: withModuleProps(ConnectorModule),
  }),
  Surface.create({
    id: 'inbox.archive',
    filter: Surface.makeFilter(Module.Archive),
    component: withModuleProps(ArchiveModule),
  }),
  // The stats panel reads plugin-debug's transient store directly — no active space needed.
  Surface.create({
    id: 'inbox.stats',
    filter: Surface.makeFilter(Module.Stats),
    component: () => <StatsModule />,
  }),
  Surface.create({
    id: 'inbox.syncState',
    filter: Surface.makeFilter(Module.SyncState),
    component: withModuleProps(SyncStateModule),
  }),
  Surface.create({
    id: 'inbox.trace',
    filter: Surface.makeFilter(Module.Trace),
    component: withModuleProps(TraceModule),
  }),
  Surface.create({
    id: 'inbox.swarmTrace',
    filter: Surface.makeFilter(Module.SwarmTrace),
    component: withModuleProps(SwarmTraceModule),
  }),
  Surface.create({
    id: 'inbox.triggers',
    filter: Surface.makeFilter(Module.Triggers),
    component: withModuleProps(TriggersModule),
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
    provides: [Capabilities.ReactSurface],
    activate: () => Effect.succeed([Capability.provide(Capabilities.ReactSurface, moduleSurfaces)]),
  }),
  Plugin.make,
);
