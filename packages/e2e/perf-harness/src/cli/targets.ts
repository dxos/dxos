//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { OFFLINE_EDGE_URL, isProductionEdgeHost } from '../partition.ts';
import { type Budget, parseBudgets } from '../score/score.ts';
import { HarnessError } from './workspace.ts';

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
    /** Names a bundle built with different settings, so its cached arms stay apart. */
    variant?: string;
  };
  /** Playwright config, relative to `appDir`. */
  config: string;
  /** The spec that drives `flow`, relative to `appDir`; the config alone runs every perf spec. */
  spec: string;
  /** Environment the flow's Playwright run needs on top of the measurement's own. */
  env?: Record<string, string>;
  /** Where reproductions of field reports live, relative to `appDir`; `perf scenario new` writes them. */
  scenarios?: string;
  /** Set on a scenario resolved from this target. */
  scenario?: string;
  /** Budgets the run is scored against, relative to `appDir`. */
  budgets: string;
  /** Files whose content defines the measurement; hashed into every ledger row. */
  harness: string[];
  /** The deterministic budget CI gates every PR on; its report is relative to `appDir`. */
  gate?: { moonTarget: string; report: string };
  /** What this measurement holds constant beyond the target; see {@link withConditions}. */
  conditions: Conditions;
};

/** The conditions every arm of one measurement shares. */
export type Conditions = {
  /** The last stage to run; later stages are skipped. */
  until?: string;
  /** Serve over HTTP/2 with a self-signed certificate, as production's CDN does; HTTP/1.1 otherwise. */
  http2?: boolean;
  /** Build with the PWA service worker on. */
  serviceWorker?: boolean;
  /** Slow the page's CPU by this factor. */
  cpuThrottle?: number;
  /** Reach nothing but loopback; the bundle's EDGE URL points at a closed loopback port too. */
  offline?: boolean;
  /** Reach a non-production EDGE and nothing else off the machine; the bundle points at it. */
  edge?: string;
  /** The port of a loopback telemetry sink the bundle's PostHog and OTel export point at. */
  telemetry?: number;
  /** Build as this release channel (`DX_ENVIRONMENT`): branding and channel-specific behaviour. */
  channel?: 'dev' | 'preview' | 'staging';
};

/** Not a real project's key: whatever the SDK sends with it goes only to the loopback sink. */
const SINK_POSTHOG_KEY = 'phc_perf_loopback_sink';

export const TARGETS: Readonly<Record<string, Target>> = {
  composer: {
    name: 'composer',
    appDir: 'packages/apps/composer-app',
    flow: 'projects-tasks',
    // PWA is decided at build time; on, a service worker precaches ~30 MB mid-run.
    build: { moonTarget: 'composer-app:bundle', env: { DX_PWA: 'false' }, outDir: 'out/composer' },
    config: 'src/playwright/playwright-perf.config.ts',
    spec: 'src/playwright/perf-projects.spec.ts',
    scenarios: 'src/playwright/scenarios',
    budgets: 'src/playwright/perf/budgets.json',
    harness: [
      'packages/e2e/perf-harness/src',
      'packages/apps/composer-app/src/playwright/perf',
      'packages/apps/composer-app/src/playwright/perf-projects.spec.ts',
      'packages/apps/composer-app/src/playwright/playwright-perf.config.ts',
      'packages/apps/composer-app/src/playwright/harness-helpers.ts',
      'packages/apps/composer-app/spec/PERF.mdl',
      'packages/apps/composer-app/scripts/check-boot-budget.mjs',
      'packages/apps/composer-app/scripts/check-startup-budget.mjs',
      'packages/apps/composer-app/scripts/score-perf.ts',
    ],
    gate: { moonTarget: 'composer-app:check-boot-budget', report: 'out/boot-budget.json' },
    conditions: {},
  },
};

/**
 * A target, or one of its scenarios: the same build and server, with the scenario's own spec, flow
 * and budgets, and the spec file counted as harness.
 */
export const resolveTarget = (name: string, scenario?: string): Target => {
  const target = TARGETS[name];
  if (!target) {
    throw new HarnessError(`unknown target "${name}"; known: ${Object.keys(TARGETS).join(', ')}`);
  }
  if (!scenario) {
    return target;
  }
  if (!target.scenarios) {
    throw new HarnessError(`target "${name}" has no scenarios`);
  }
  const spec = path.join(target.scenarios, `perf-${scenario}.spec.ts`);
  return {
    ...target,
    flow: scenario,
    spec,
    budgets: path.join(target.scenarios, `budgets-${scenario}.json`),
    harness: [...target.harness, path.join(target.appDir, spec)],
    env: { DX_PERF_SCENARIOS: '1' },
    scenario,
  };
};

/** The target's budgets, or none for a scenario not calibrated yet. */
export const readBudgets = (root: string, target: Target): Record<string, Budget> => {
  const file = path.join(root, target.appDir, target.budgets);
  return existsSync(file) ? parseBudgets(JSON.parse(readFileSync(file, 'utf8'))) : {};
};

/** The flow's environment for each condition; the harness reads them back (`flowConditions`, `StageRunner`). */
export const conditionsEnv = ({
  until,
  http2,
  serviceWorker,
  cpuThrottle,
  offline,
  edge,
  telemetry,
  channel,
}: Conditions): Record<string, string> => ({
  ...(until ? { DX_PERF_UNTIL: until } : {}),
  ...(http2 ? { DX_PERF_HTTP2: '1' } : {}),
  ...(serviceWorker ? { DX_PERF_SERVICE_WORKER: '1' } : {}),
  ...(cpuThrottle && cpuThrottle > 1 ? { DX_PERF_CPU_THROTTLE: String(cpuThrottle) } : {}),
  ...(offline ? { DX_PERF_OFFLINE: '1' } : {}),
  ...(edge ? { DX_PERF_EDGE: edge } : {}),
  ...(telemetry ? { DX_PERF_TELEMETRY: '1' } : {}),
  ...(channel ? { DX_PERF_CHANNEL: channel } : {}),
});

/** A target measured under `conditions`: the build, the server and the flow all follow them. */
export const withConditions = (target: Target, conditions: Conditions = {}): Target => {
  const edgeHost = conditions.edge && URL.canParse(conditions.edge) ? new URL(conditions.edge).hostname : undefined;
  if (conditions.edge && !edgeHost) {
    throw new HarnessError(`--edge takes a URL, not "${conditions.edge}"`);
  }
  if (edgeHost && isProductionEdgeHost(edgeHost)) {
    throw new HarnessError('--edge must name a non-production EDGE; production syncs live data');
  }
  if (edgeHost && conditions.offline) {
    throw new HarnessError('--offline and --edge are exclusive: one partition at a time');
  }
  const variant = [
    conditions.serviceWorker && 'sw',
    conditions.offline && 'offline',
    edgeHost && `edge-${edgeHost}`,
    conditions.telemetry && 'telemetry',
    conditions.channel,
  ]
    .filter(Boolean)
    .join('-');
  const sink = conditions.telemetry ? `http://127.0.0.1:${conditions.telemetry}` : undefined;
  return {
    ...target,
    conditions,
    build: {
      ...target.build,
      env: {
        ...target.build.env,
        ...(conditions.serviceWorker ? { DX_PWA: 'true' } : {}),
        ...(conditions.offline ? { DX_EDGE_BASE_URL: OFFLINE_EDGE_URL } : {}),
        ...(conditions.channel ? { DX_ENVIRONMENT: conditions.channel } : {}),
        ...(conditions.edge
          ? { DX_EDGE_BASE_URL: conditions.edge, DX_HUB_URL: new URL('hub/', conditions.edge).href }
          : {}),
        ...(sink
          ? {
              DX_POSTHOG_API_KEY: SINK_POSTHOG_KEY,
              DX_POSTHOG_API_HOST: sink,
              DX_OTEL_ENDPOINT: `${sink}/api/otel`,
              DX_FEEDBACK_LOGS_ENDPOINT: `${sink}/api/feedback-logs`,
            }
          : {}),
      },
      ...(variant ? { variant } : {}),
    },
    env: { ...target.env, ...conditionsEnv(conditions) },
  };
};

/** One line for a run's header, or nothing when every condition is the default. */
export const describeConditions = ({
  until,
  http2,
  serviceWorker,
  cpuThrottle,
  offline,
  edge,
  telemetry,
  channel,
}: Conditions): string | undefined => {
  const parts = [
    until && `until ${until}`,
    http2 && 'HTTP/2',
    serviceWorker && 'service worker',
    cpuThrottle && cpuThrottle > 1 && `CPU ${cpuThrottle}x slower`,
    offline && 'offline',
    edge && `EDGE ${edge} only`,
    telemetry && `telemetry to a loopback sink on :${telemetry}`,
    channel && `${channel} channel`,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(', ') : undefined;
};
