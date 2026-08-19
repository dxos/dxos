//
// Copyright 2026 DXOS.org
//

/**
 * Specs the `vite preview` configs cannot host, shared by every one of them so the list has a single
 * home: `startup.spec.ts` records benchmark rows rather than asserting behaviour, `dev-*` needs
 * `vite serve`, and `welcome-focus.spec.ts` drives Storybook on :9009. Each has its own config and
 * moon task (`e2e-startup`, `e2e-dev`, `e2e-welcome-focus`).
 */
export const UNHOSTABLE_SPECS = ['**/startup.spec.ts', '**/dev-*.spec.ts', '**/welcome-focus.spec.ts'];

/**
 * Additionally excluded from a production-plugin-set run: the curated set deliberately ships neither
 * `plugin-inbox` nor a mail provider, so this spec asserts behaviour that build does not claim.
 */
export const NON_PRODUCTION_SET_SPECS = ['**/inbox.spec.ts'];
