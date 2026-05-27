//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.doctor'),
  name: 'Doctor',
  author: 'DXOS',
  description: trim`
    Doctor adds a self-introspection blueprint to Composer. When the blueprint
    is loaded the assistant gains access to the queryComposerLogs tool, which
    reads the browser tab's own NDJSON log store (populated by
    @dxos/log-store-idb) directly from IndexedDB — no log file download or
    external service required. The assistant can use this tool to investigate
    unexpected behaviour, count error occurrences, or explain what happened
    during a specific time window without leaving the chat.

    The query operation supports the same filtering vocabulary as the
    scripts/query-logs.mjs CLI: LOG_FILTER tokens (e.g. dxos.echo, !dxos.net),
    message and raw-JSON regular expressions, time bounds (ISO or epoch ms),
    and level allow-lists (T/D/V/I/W/E). Results can be projected to a subset
    of fields via the select parameter to keep responses concise, and output
    can be formatted as JSON, JSONL, or a human-readable pretty string matching
    the CLI's formatLine output.

    Aggregate queries are supported via groupBy and aggregate parameters.
    Setting groupBy to level, message, file, or a context path returns a ranked
    frequency table; aggregate=sample includes representative entries per
    bucket; aggregate=firstLast adds the earliest and latest timestamps so the
    assistant can identify when a recurring message started or stopped.

    Hard caps clamp limit and topK to 1000 and sampleSize to 25. The IDB
    cursor exits early once the requested number of un-filtered rows is
    collected, so cheap tail queries are fast even on a large log store. The
    truncated flag signals when results were capped so the assistant can
    prompt the user to narrow the query.
  `,
  icon: 'ph--first-aid-kit--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-doctor',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
