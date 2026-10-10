//
// Copyright 2026 DXOS.org
//

/** An app the CLI can build, serve and measure. Paths are workspace-relative unless noted. */
export type Target = {
  name: string;
  /** Where the build, preview server and Playwright run. */
  appDir: string;
  /** The `flow` property the spec stamps on its rows. */
  flow: string;
  build: {
    moonTarget: string;
    env: Record<string, string>;
    /** Relative to `appDir`. */
    outDir: string;
  };
  /** Playwright config, relative to `appDir`. */
  config: string;
  /** Budgets the run is scored against, relative to `appDir`. */
  budgets: string;
  /** Files whose content defines the measurement; hashed into every ledger row. */
  harness: string[];
  /** The deterministic budget CI gates every PR on; its report is relative to `appDir`. */
  gate?: { moonTarget: string; report: string };
};

export const TARGETS: Readonly<Record<string, Target>> = {
  composer: {
    name: 'composer',
    appDir: 'packages/apps/composer-app',
    flow: 'projects-tasks',
    // PWA is decided at build time; on, a service worker precaches ~30 MB mid-run.
    build: { moonTarget: 'composer-app:bundle', env: { DX_PWA: 'false' }, outDir: 'out/composer' },
    config: 'src/playwright/playwright-perf.config.ts',
    budgets: 'src/playwright/perf/budgets.json',
    harness: [
      'packages/e2e/perf-harness/src',
      'packages/apps/composer-app/src/playwright/perf',
      'packages/apps/composer-app/src/playwright/perf-projects.spec.ts',
      'packages/apps/composer-app/src/playwright/playwright-perf.config.ts',
      'packages/apps/composer-app/src/playwright/harness-helpers.ts',
    ],
    gate: { moonTarget: 'composer-app:check-boot-budget', report: 'out/boot-budget.json' },
  },
};
