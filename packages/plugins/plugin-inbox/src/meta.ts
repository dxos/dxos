//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.inbox',
  name: 'Inbox',
  author: 'DXOS',
  description: trim`
    A unified inbox for managing email, calendar events, and contacts directly inside your workspace. Mailboxes and calendars are backed by append-only ECHO feeds, so messages and events stream in from sync without ever overwriting history.

    Connect a Google Integration to pull Gmail messages, Calendar events, and Contact groups into the space; subsequent syncs use delta tokens to fetch only what changed. Compose, reply, and forward inline — drafts live in ECHO and outbound mail is dispatched via the linked Integration.

    Saved filters and labels narrow the message list to the conversations that matter, and an optional thread view groups responses by conversation. Each selected message surfaces related contacts, events, and thread history alongside the reading pane so context is always one click away.

    An Inbox blueprint gives AI agents tools to read, draft, classify, and sync mail, plus message extractors that parse confirmation emails (flights, hotels, reservations) into structured Trip and Event objects in the space.
  `,
  icon: 'ph--address-book-tabs--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-inbox',
  tags: ['integration'],
};
