//
// Copyright 2026 DXOS.org
//

// Where each sample space's namespace is declared: the package barrel re-exports this directory,
// and the exports map gives each one its own subpath. A consumer imports the one it needs
// (`@dxos/plugin-debug/WeatherSpace`), so the other five worlds stay out of its module graph.
export * as IncidentSpace from './incident/IncidentSpace.ts';
export * as PipelineSpace from './crm/PipelineSpace.ts';
export * as StockfishSpace from './stockfish/StockfishSpace.ts';
export * as TidepoolSpace from './tidepool/TidepoolSpace.ts';
export * as WeatherSpace from './weather/WeatherSpace.ts';
export * as WorkerSpace from './worker/WorkerSpace.ts';
