//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.meeting'),
  name: 'Meetings',
  author: 'DXOS',
  description: trim`
    Comprehensive meeting management that captures notes, generates real-time transcriptions, and produces AI-powered summaries of every session.
    Each meeting record stores an ISO-timestamped creation time, a list of participant identities, and three linked documents: a live transcript feed, a freeform markdown notes editor, and an AI-generated summary.

    The plugin integrates with the Calls plugin so that joining a call automatically opens a TranscriptionManager, routes the audio feed to a transcript object in ECHO, and synchronises the active meeting identity across all peers in the session.
    Participants can switch which meeting is active at any time, and the call layer propagates the selection via a typed activity payload so every peer stays in sync.

    AI summarisation sends the combined transcript and notes content to a language model, which returns a structured markdown document containing key discussion points, verbatim quotes, and a checklist of clearly assigned action items.
    The summary is written back to ECHO and replicated to all peers; the meeting article view displays a generate button on first use and a regenerate button once a summary exists.
  `,
  icon: 'ph--note--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-meeting',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
  // TODO(wittjosiah): Needs new screenshots.
  screenshots: ['https://dxos.network/plugin-details-calls-dark.png'],
});
