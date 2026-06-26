//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.support',
    name: 'Support',
    author: 'DXOS',
    description: trim`
      Support provides three user-assistance paths inside Composer. The
      conversational path lets users open a Ticket from the navtree and work with
      the AI assistant to diagnose problems: the assistant searches documentation,
      proposes solutions, and marks the ticket in-progress or resolved. Tickets
      are local-first ECHO objects, so the conversation history is replicated
      across devices and can be reviewed by a human supporter later.

      The one-shot feedback path surfaces a help companion in the deck that lets
      users send anonymous feedback to the observability backend with a single
      form submission. The feedback form captures issue type (bug or feature),
      severity, a short title, a longer description, and an optional plugin area.
      When the user has authenticated a GitHub integration the issue is filed via
      the GitHub API; otherwise a prefilled issues/new URL is opened in a new tab
      so the user can complete submission in their own browser session. Debug logs
      can be attached to any submission via the LogDownloader capability.

      The support skill registers the createTicket, markInProgress,
      resolveTicket, and searchDocs operations as AI tools. When a Ticket is the
      active object the skill is bound to the chat companion so the assistant
      can manage the ticket lifecycle without leaving the conversation. The
      searchDocs operation starts with an in-memory stub and is designed to be
      replaced by a vector index or remote search endpoint without changing the
      schema.

      A future iteration will absorb plugin-help (welcome tour, contextual hints,
      keyboard shortcuts) so all user education lives in a single plugin. The
      initial scope is a Ticket schema, four ticket operations, a FeedbackForm
      component, and two surfaces (Ticket article and the --help companion),
      exercisable end-to-end while documentation search and issue filing
      integrations land in later phases.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-support',
    icon: { key: 'ph--lifebuoy--regular', hue: 'rose' },
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
});
