//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Finding, Research } from '#types';

export const translations = [
  ...formTranslations,
  {
    'en-US': {
      [Type.getTypename(Research.Research)]: {
        'typename.label': 'Research',
        'typename.label_other': 'Research',
        'object-name.placeholder': 'New research',
        'add-object.label': 'Add research',
        'rename-object.label': 'Rename research',
        'delete-object.label': 'Delete research',
      },
      [Type.getTypename(Finding.Finding)]: {
        'typename.label': 'Finding',
        'typename.label_other': 'Findings',
      },
      [meta.profile.key]: {
        'plugin.name': 'Lighthouse',
        'result.companion.label': 'Result',
        'run.label': 'Run',
        'run-again.label': 'Run again',
        'stop.label': 'Stop',
        'engines.label_zero': 'Search engines: the agent chooses',
        'engines.label_one': 'Search engines: {{count}} chosen',
        'engines.label_other': 'Search engines: {{count}} chosen',
        'no-connection.message': 'Connect lighthouse first: add a Lighthouse connection in Settings → Connections.',
        'view-filter.label': 'Filter results',
        'view-all.label': 'All results',
        'view-findings.label': 'Findings',
        'no-results.message': 'Write a goal and run it; results appear here as the agent finds them.',
        'no-results-yet.message': 'Results appear here as the agent extracts them.',
        'no-findings.message': 'No findings yet: star a result, or wait for the report.',
        'no-result-selected.message': 'No result selected.',
        'pick.label': 'Pick #{{index}}',
        'kept-pick.label': 'Kept · pick',
        'kept-person.label': 'Kept · starred',
        'vote-up.label': 'Good result',
        'vote-down.label': 'Bad result',
        'missed.label': 'Misses: {{requirements}}',
        'score.label': 'Score {{score}}',
        'close.label': 'Close',
        'rating.label': 'Rating',
        'facts.label': 'Facts',
        'provenance.label': 'Where these facts came from',
        'provenance-unknown.message': 'Lighthouse did not report where these facts came from.',
        'more-about.label': 'More about this',
        'extension-read.label': 'Read',
        'extension-research.label': 'Research',
        'extension-refresh.label': 'Read again',
        'extension-empty.message': 'Nothing found.',
        'meter-pages.label': 'Pages {{spent}}/{{limit}}',
        'meter-cost.label': 'Cost ${{spent}}/${{limit}}',
        'meter-time.label': 'Time {{spent}}/{{limit}} min',
        'status.starting': 'starting',
        'status.running': 'running',
        'status.idle': 'idle',
        'status.reported': 'reported',
        'status.stopped': 'stopped',
        'status.failed': 'failed',
        'reconnecting.label': 'reconnecting',
        'composer.label': 'Message the agent',
        'composer.placeholder': 'Ask a follow-up, correct it, or narrow the search…',
        'composer-busy.placeholder': 'Queued until the agent finishes its turn…',
        'send.label': 'Send',
        'retry.message': 'Continue where you left off.',
        'picks.label_one': 'Reported {{count}} pick',
        'picks.label_other': 'Reported {{count}} picks',
        'gaps.label': 'Gaps: {{gaps}}',
        'pills.label_one': '{{count}} result into the graph',
        'pills.label_other': '{{count}} results into the graph',
        'pills-followed.label_one': 'Opened results: {{count}} result into the graph',
        'pills-followed.label_other': 'Opened results: {{count}} results into the graph',
        'pills-more.label': '+ {{count}} more in the results',
      },
    },
  },
] as const satisfies Theme.Resource[];
