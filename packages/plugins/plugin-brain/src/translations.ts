//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { BrainNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [BrainNamespace.key]: {
        'plugin.name': 'Brain',
        'memory-section.label': 'Memory',
        'pipeline-companion.label': 'Pipeline',
        'pipeline-none.message': 'No pipeline run is recorded in this memory.',
        'pipeline-run.label': 'Run',
        'pipeline-time.label': 'Time',
        'pipeline-duration.label': 'Duration',
        'pipeline-messages.label': 'Messages',
        'pipeline-first.label': 'First message',
        'pipeline-last.label': 'Last message',
        'pipeline-facts.label': 'Facts',
        'pipeline-calls.label': 'Model calls',
        'pipeline-cost.label': 'Cost',
        'pipeline-stage.label': 'Stage',
        'pipeline-model.label': 'Model',
        'pipeline-channel.label': 'Channel',
        'pipeline-cursor.label': 'Cursor',
        'memory-statements.label': '{{total}} statements',
        'memory-import.button': 'Import TriG',
        'memory-export.button': 'Export TriG',
        'memory-importing.message': 'Importing {{name}}…',
        'memory-imported.message': 'Imported {{total}} quads from {{name}}',
        'memory-import-failed.message': 'Import failed: {{error}}',
        'memory-export-failed.message': 'Export failed: {{error}}',
        'memory-run.button': 'Run',
        'memory-no-queries.message': 'Queries run against this memory, by an agent or here, appear as they run.',
        'memory-live.label': 'Live query',
        'memory-query.label': 'Query',
        'memory-running.message': 'running…',
        'memory-query-failed.message': 'failed',
        'memory-rows.message': '{{total}} rows',
      },
    },
  },
] as const satisfies Theme.Resource[];
