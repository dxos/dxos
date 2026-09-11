//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { IncidentSpace, PipelineSpace, StockfishSpace, TidepoolSpace, WorkerSpace } from '../sample/index.ts';

/**
 * The sample spaces this plugin offers. Loaded only once something asks for the list — the content
 * and the builder ride this module's chunk, not the plugin definition's.
 *
 * They live here rather than in the plugins whose types they use: the content is a debugging aid,
 * and every consumer of it (the generator panel, the create-space templates) is this plugin's.
 */
export default [
  SampleSpace.preset({
    id: 'org.dxos.plugin-debug.sample.pipeline',
    label: 'Northwind Sales',
    description: 'Seven accounts across the pipeline stages, a contact each, and the mail behind them.',
    definition: PipelineSpace(),
  }),
  SampleSpace.preset({
    id: 'org.dxos.plugin-debug.sample.tidepool',
    label: 'Tidepool — Offline sync v2',
    description: 'A work-stream with a two-level task tree, a .mdl spec, an architecture note and a decision log.',
    definition: TidepoolSpace(),
  }),
  SampleSpace.preset({
    id: 'org.dxos.plugin-debug.sample.stockfish',
    label: 'Chess MCP on Workers',
    description:
      'A brief, a five-stage plan as a task tree, a position to test against, and the skill for building it in a sandbox.',
    definition: StockfishSpace(),
  }),
  SampleSpace.preset({
    id: 'org.dxos.plugin-debug.sample.worker',
    label: 'Hello Worker',
    description: 'Five tasks from an empty sandbox to a Cloudflare Worker that answers, with no account to start.',
    definition: WorkerSpace(),
  }),
  SampleSpace.preset({
    id: 'org.dxos.plugin-debug.sample.incident',
    label: 'Incident 0516 retrospective',
    description: "A status log, four people's notes, and the four tasks that turn them into a filed retro.",
    definition: IncidentSpace(),
  }),
] satisfies ReadonlyArray<AppCapabilities.SampleSpace>;
