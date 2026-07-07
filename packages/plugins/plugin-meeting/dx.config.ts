//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.meeting',
    name: 'Meetings',
    author: 'DXOS',
    description: trim`
      Comprehensive meeting management that captures notes, generates real-time transcriptions, and produces AI-powered summaries of every session.
      Each meeting record stores an ISO-timestamped creation time, a list of participant identities, and three linked documents: a live transcript feed, a freeform markdown notes editor, and an AI-generated summary.

      The plugin integrates with the Calls plugin so that enabling transcription during a call writes native RealtimeKit transcript segments to a transcript object in ECHO, and synchronises the active meeting identity across all peers in the session.
      Participants can switch which meeting is active at any time, and the call layer propagates the selection via a typed activity payload so every peer stays in sync.

      AI summarisation sends the combined transcript and notes content to a language model, which returns a structured markdown document containing key discussion points, verbatim quotes, and a checklist of clearly assigned action items.
      The summary is written back to ECHO and replicated to all peers; the meeting article view displays a generate button on first use and a regenerate button once a summary exists.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting',
    icon: { key: 'ph--handshake--regular', hue: 'yellow' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    // TODO(wittjosiah): Needs new screenshots.
    screenshots: [{ dark: 'https://dxos.network/plugin-details-calls-dark.png' }],
  },
});
