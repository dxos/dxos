//
// Copyright 2026 DXOS.org
//

/**
 * Port for the suite's own harness dev server (`harness/vite.config.ts`). Fixed and `strictPort`, so
 * a stale server from a previous run fails the launch loudly instead of the suite silently driving
 * yesterday's code. `DX_STRESS_PORT` selects a different fixed port when the default is already taken.
 */
const DEFAULT_HARNESS_PORT = 9010;

// Throws rather than coercing, so a malformed value cannot silently fall back to the port the
// override exists to avoid.
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
