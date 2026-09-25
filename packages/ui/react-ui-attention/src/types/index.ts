//
// Copyright 2026 DXOS.org
//

// A UI-free entrypoint: the attention/selection/view state definitions with no React attached, so
// operation handlers and app-graph builders running under node or bun can use them without pulling
// the components.

export * as Attention from './Attention.ts';
export * as Selection from './Selection.ts';
export * as ViewState from './ViewState.ts';

// The view-state backends: Effect atoms over the definitions above, with no React of their own, so
// a headless host can construct a `ViewState.Manager` without the provider component that wraps it
// in the browser.
export * from '../core/index.ts';
