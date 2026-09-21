//
// Copyright 2026 DXOS.org
//

// Where each template's namespace is declared: the package barrel re-exports this directory, and
// the exports map gives each namespace its own subpath. A consumer imports the one it needs
// (`@dxos/plugin-debug/WeatherTemplate`), so the other five worlds stay out of its module graph.
export * as IncidentTemplate from './incident/IncidentTemplate.ts';
export * as PipelineTemplate from './crm/PipelineTemplate.ts';
export * as StockfishTemplate from './stockfish/StockfishTemplate.ts';
export * as TidepoolTemplate from './tidepool/TidepoolTemplate.ts';
export * as WeatherTemplate from './weather/WeatherTemplate.ts';
export * as WorkerTemplate from './worker/WorkerTemplate.ts';
