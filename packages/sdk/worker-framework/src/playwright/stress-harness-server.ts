//
// Copyright 2026 DXOS.org
//

/**
 * Port for the suite's own harness dev server (`harness/vite.config.ts`). Fixed and `strictPort`, so
 * a stale server from a previous run fails the launch loudly instead of the suite silently driving
 * yesterday's code. `DX_STRESS_PORT` moves it when something unrelated already owns the default
 * (a Storybook on 9010, say) — still a fixed port, still strict, just a different one.
 */
const DEFAULT_HARNESS_PORT = 9010;

// Throws rather than coercing: `Number('storybook') || 9010` would silently fall back to the port
// the override was set to avoid, and the collision it was meant to fix would resurface as a
// confusing launch failure.
const resolvePort = (): number => {
  const raw = process.env.DX_STRESS_PORT;
  if (raw === undefined || raw === '') {
    return DEFAULT_HARNESS_PORT;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`DX_STRESS_PORT must be a valid port number, got ${JSON.stringify(raw)}`);
  }
  return value;
};

export const HARNESS_PORT = resolvePort();

export const HARNESS_URL = `http://localhost:${HARNESS_PORT}/`;
