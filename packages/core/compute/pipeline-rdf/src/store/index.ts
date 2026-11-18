//
// Copyright 2026 DXOS.org
//

export * from './fact-graph.ts';
export * from './fact-store.ts';
export * as FactStoreHttp from './fact-store-http.ts';
export * as FactStoreLive from './fact-store-live.ts';
export * as FactAnalyticsLive from './analytics.ts';
export { type FactAnalytics } from './analytics.ts';

// The public query and aggregate types live with the sparql internals but are part of the store's surface.
export { type SemanticQuery } from '../internal/sparql/query-builder.ts';
export {
  FACT_DIMENSIONS,
  type FactAggregate,
  type FactDimension,
  type FactGroup,
  type FactGrouping,
} from '../internal/sparql/aggregate.ts';
