//
// Copyright 2026 DXOS.org
//

export * from './crawler-stores.ts';
export * from './discord-fixture.ts';
export * from './semantic-facts.ts';

// NOTE: `./modules` (the ModuleContainer surface registration) is intentionally NOT re-exported here:
// the module components import `CrawlerStores` back through this barrel, so re-exporting the
// registration would form an initialization cycle (TDZ). Stories import it from `../testing/modules`.
