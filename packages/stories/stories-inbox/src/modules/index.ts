//
// Copyright 2026 DXOS.org
//

import * as Role from '@dxos/app-framework/Role';
import * as Surface from '@dxos/app-framework/Surface';

import { ArchiveModule } from './ArchiveModule.tsx';
import { ConnectorModule } from './ConnectorModule.tsx';
import { FactsModule } from './FactsModule.tsx';
import {
  AttachmentModule,
  SelectedMessageBlocksModule,
  SelectedMessageJsonModule,
  SelectedMessageModule,
  ThreadJsonModule,
  ThreadModule,
} from './MailboxArticleModules.tsx';
import { MailboxModule } from './MailboxModule.tsx';
import { MessageModule } from './MessageModule.tsx';
import { StatsModule } from './StatsModule.tsx';
import { SwarmTraceModule } from './SwarmTraceModule.tsx';
import { SyncStateModule } from './SyncStateModule.tsx';
import { TopicsModule } from './TopicsModule.tsx';
import { TraceModule } from './TraceModule.tsx';
import { TriggersModule } from './TriggersModule.tsx';

export { THREAD_CONTEXT_ID } from './MailboxArticleModules.tsx';

/**
 * Role tokens for the story columns. Each module is contributed as a dedicated surface
 * under its own role NSID (role-only dispatch), so a story layout is a plain grid of these tokens
 * and each surface resolves the active space via `useActiveSpace()`.
 */
export const StoryRole = {
  Archive: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.archive'),
  Attachment: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.attachment'),
  Connector: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.connector'),
  Facts: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.facts'),
  Mailbox: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.mailbox'),
  Message: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.message'),
  SelectedMessage: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.selectedMessage'),
  SelectedMessageBlocks: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.selectedMessageBlocks'),
  SelectedMessageJson: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.selectedMessageJson'),
  Stats: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.stats'),
  SwarmTrace: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.swarmTrace'),
  SyncState: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.syncState'),
  Thread: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.thread'),
  ThreadJson: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.threadJson'),
  Topics: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.topics'),
  Trace: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.trace'),
  Triggers: Role.make<Record<string, unknown>>('org.dxos.storybook.inbox.triggers'),
};

/** React surfaces for the story columns, one per `StoryRole` token. */
export const moduleSurfaces: Surface.Definition[] = [
  Surface.create({
    id: 'inbox.archive',
    filter: Surface.makeFilter(StoryRole.Archive),
    component: ArchiveModule,
  }),
  Surface.create({
    id: 'inbox.attachment',
    filter: Surface.makeFilter(StoryRole.Attachment),
    component: AttachmentModule,
  }),
  Surface.create({
    id: 'inbox.connector',
    filter: Surface.makeFilter(StoryRole.Connector),
    component: ConnectorModule,
  }),
  Surface.create({
    id: 'inbox.facts',
    filter: Surface.makeFilter(StoryRole.Facts),
    component: FactsModule,
  }),
  Surface.create({
    id: 'inbox.mailbox',
    filter: Surface.makeFilter(StoryRole.Mailbox),
    component: MailboxModule,
  }),
  Surface.create({
    id: 'inbox.message',
    filter: Surface.makeFilter(StoryRole.Message),
    component: MessageModule,
  }),
  Surface.create({
    id: 'inbox.selectedMessage',
    filter: Surface.makeFilter(StoryRole.SelectedMessage),
    component: SelectedMessageModule,
  }),
  Surface.create({
    id: 'inbox.selectedMessageBlocks',
    filter: Surface.makeFilter(StoryRole.SelectedMessageBlocks),
    component: SelectedMessageBlocksModule,
  }),
  Surface.create({
    id: 'inbox.selectedMessageJson',
    filter: Surface.makeFilter(StoryRole.SelectedMessageJson),
    component: SelectedMessageJsonModule,
  }),
  Surface.create({
    id: 'inbox.stats',
    filter: Surface.makeFilter(StoryRole.Stats),
    component: StatsModule,
  }),
  Surface.create({
    id: 'inbox.swarmTrace',
    filter: Surface.makeFilter(StoryRole.SwarmTrace),
    component: SwarmTraceModule,
  }),
  Surface.create({
    id: 'inbox.syncState',
    filter: Surface.makeFilter(StoryRole.SyncState),
    component: SyncStateModule,
  }),
  Surface.create({
    id: 'inbox.thread',
    filter: Surface.makeFilter(StoryRole.Thread),
    component: ThreadModule,
  }),
  Surface.create({
    id: 'inbox.threadJson',
    filter: Surface.makeFilter(StoryRole.ThreadJson),
    component: ThreadJsonModule,
  }),
  Surface.create({
    id: 'inbox.topics',
    filter: Surface.makeFilter(StoryRole.Topics),
    component: TopicsModule,
  }),
  Surface.create({
    id: 'inbox.trace',
    filter: Surface.makeFilter(StoryRole.Trace),
    component: TraceModule,
  }),
  Surface.create({
    id: 'inbox.triggers',
    filter: Surface.makeFilter(StoryRole.Triggers),
    component: TriggersModule,
  }),
];
