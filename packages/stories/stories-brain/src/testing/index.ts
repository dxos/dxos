//
// Copyright 2026 DXOS.org
//

export * from './crawler-stores';
export * from './discord-fixture';
export * from './semantic-facts';

// NOTE: `./modules` (the ModuleContainer surface registration) is intentionally NOT re-exported here:
// the module components import `CrawlerStores` back through this barrel, so re-exporting the
// registration would form an initialization cycle (TDZ). Stories import it from `../testing/modules`.
