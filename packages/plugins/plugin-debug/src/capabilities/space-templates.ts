//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import {
  IncidentSpace,
  PipelineSpace,
  StockfishSpace,
  TidepoolSpace,
  WeatherSpace,
  WorkerSpace,
} from '../samples/index.ts';

/**
 * The space templates this plugin offers, one per sample space under `src/samples/`. Loaded only
 * once something asks for the list — the content and the builder ride this module's chunk, not the
 * plugin definition's.
 *
 * The samples live here rather than in the plugins whose types they use: the content is a debugging
 * aid, and every consumer of it (the generator panel, the create-space dialog) is this plugin's.
 */
export default [
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.pipeline',
    label: 'Northwind Sales',
    description: 'Seven accounts across the pipeline stages, a contact each, and the mail behind them.',
    definition: PipelineSpace.make(),
  }),
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.tidepool',
    label: 'Tidepool — Offline sync v2',
    description: 'A work-stream with a two-level task tree, a .mdl spec, an architecture note and a decision log.',
    definition: TidepoolSpace.make(),
  }),
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.stockfish',
    label: 'Chess MCP on Workers',
    description:
      'A brief, a five-stage plan as a task tree, a position to test against, and the skill for building it in a sandbox.',
    definition: StockfishSpace.make(),
  }),
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.worker',
    label: 'Hello Worker',
    description: 'Five tasks from an empty sandbox to a Cloudflare Worker that answers, with no account to start.',
    definition: WorkerSpace.make(),
  }),
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.weather',
    label: 'Weather MCP',
    description:
      'Four tasks an agent runs alone: a one-tool MCP server over a weather API, deployed to a temporary Worker and called from the chat.',
    definition: WeatherSpace.make(),
  }),
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.incident',
    label: 'Incident 0516 retrospective',
    description: "A status log, four people's notes, and the four tasks that turn them into a filed retro.",
    definition: IncidentSpace.make(),
  }),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;
