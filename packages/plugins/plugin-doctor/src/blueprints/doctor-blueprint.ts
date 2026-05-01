//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { QueryComposerLogs } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.doctor';

const operations = [QueryComposerLogs];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Doctor',
    description: trim`
      Self-introspection: read this Composer browser tab's own runtime logs from
      the local IndexedDB log store. Enable to triage bugs, explain unexpected
      behavior, find noisy code paths, or verify that an action took effect.
      Read-only and bounded — never modifies the log store.
    `,
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You can introspect this Composer browser tab's own logs to diagnose problems.

        What this is:
        - Logs are written by every part of Composer through @dxos/log and persisted to an
          IndexedDB-backed store. Each entry has fields: t (ISO timestamp), l (level letter
          T/D/V/I/W/E), m (message), f (source file), n (line), o (logger / object), c
          (context JSON), i (tab id), e (error).

        Why and when to use it:
        - The user reports a bug, an error toast, or unexpected behavior. Look at logs first.
        - The user asks "why is X slow / loud / failing". Aggregate by message or file to find
          the source.
        - You want to verify your own actions had effect — check for the relevant log line
          afterward.

        How to use it:
        - Always pass the smallest filter you can. Prefer "filters" (LOG_FILTER syntax) over
          "grep".
        - For triage, start with groupBy: "level" or groupBy: "message" + aggregate: "count".
        - Use since/until to focus on the recent past — start with the last 5 minutes.
        - For ECHO query traces, queries are tagged with c.debugLabel; group by
          context.debugLabel.
        - Hard limits: max 1000 entries, max 1000 buckets, max 25 samples per bucket.
          Re-query with tighter filters if you hit them.

        Do NOT:
        - Dump all logs without aggregation; you will exhaust your context window.
        - Treat the absence of a log as proof — the user's logFilter config may suppress
          trace-level rows.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
