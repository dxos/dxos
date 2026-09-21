//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SpaceTemplate from '@dxos/app-toolkit/SpaceTemplate';

import {
  IncidentTemplate,
  PipelineTemplate,
  StockfishTemplate,
  TidepoolTemplate,
  WeatherTemplate,
  WorkerTemplate,
} from '../templates/index.ts';

/**
 * The space templates this plugin offers. Loaded only once something asks for the list — the content
 * and the builder ride this module's chunk, not the plugin definition's.
 *
 * They live here rather than in the plugins whose types they use: the content is a debugging aid,
 * and every consumer of it (the generator panel, the create-space dialog) is this plugin's.
 */
export default [
  SpaceTemplate.preset({
    id: 'org.dxos.plugin-debug.template.pipeline',
    label: 'Northwind Sales',
    description: 'Seven accounts across the pipeline stages, a contact each, and the mail behind them.',
    definition: PipelineTemplate(),
  }),
  SpaceTemplate.preset({
    id: 'org.dxos.plugin-debug.template.tidepool',
    label: 'Tidepool — Offline sync v2',
    description: 'A work-stream with a two-level task tree, a .mdl spec, an architecture note and a decision log.',
    definition: TidepoolTemplate(),
  }),
  SpaceTemplate.preset({
    id: 'org.dxos.plugin-debug.template.stockfish',
    label: 'Chess MCP on Workers',
    description:
      'A brief, a five-stage plan as a task tree, a position to test against, and the skill for building it in a sandbox.',
    definition: StockfishTemplate(),
  }),
  SpaceTemplate.preset({
    id: 'org.dxos.plugin-debug.template.worker',
    label: 'Hello Worker',
    description: 'Five tasks from an empty sandbox to a Cloudflare Worker that answers, with no account to start.',
    definition: WorkerTemplate(),
  }),
  SpaceTemplate.preset({
    id: 'org.dxos.plugin-debug.template.weather',
    label: 'Weather MCP',
    description:
      'Four tasks an agent runs alone: a one-tool MCP server over a weather API, deployed to a temporary Worker and called from the chat.',
    definition: WeatherTemplate(),
  }),
  SpaceTemplate.preset({
    id: 'org.dxos.plugin-debug.template.incident',
    label: 'Incident 0516 retrospective',
    description: "A status log, four people's notes, and the four tasks that turn them into a filed retro.",
    definition: IncidentTemplate(),
  }),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;
