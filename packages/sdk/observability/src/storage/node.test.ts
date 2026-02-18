//
// Copyright 2025 DXOS.org
//

import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import yaml from 'js-yaml';
import { validate as validateUuid } from 'uuid';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  type PersistentObservabilityState,
  getObservabilityGroup,
  isObservabilityDisabled,
  showObservabilityBanner,
  storeObservabilityDisabled,
  storeObservabilityGroup,
} from './node';

let configDir: string;

beforeEach(async () => {
  configDir = join(tmpdir(), `observability-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  // Clean env vars.
  delete process.env.DX_DISABLE_OBSERVABILITY;
  delete process.env.DX_OBSERVABILITY_GROUP;
});

afterEach(async () => {
  if (existsSync(configDir)) {
    await rm(configDir, { recursive: true, force: true });
  }
});

describe('node storage', () => {
  test('creates config directory if missing', async () => {
    expect(existsSync(configDir)).toBe(false);
    await isObservabilityDisabled(configDir);
    expect(existsSync(configDir)).toBe(true);
  });

  test('initializes state with UUID and writes observability.yml', async () => {
    await isObservabilityDisabled(configDir);
    const content = await readFile(join(configDir, 'observability.yml'), 'utf-8');
    const state = yaml.load(content) as PersistentObservabilityState;
    expect(validateUuid(state.installationId)).toBe(true);
    expect(state.disabled).toBe(false);
  });

  test('isObservabilityDisabled returns false by default', async () => {
    const disabled = await isObservabilityDisabled(configDir);
    expect(disabled).toBe(false);
  });

  test('storeObservabilityDisabled persists to file', async () => {
    await storeObservabilityDisabled(configDir, true);
    const content = await readFile(join(configDir, 'observability.yml'), 'utf-8');
    const state = yaml.load(content) as PersistentObservabilityState;
    expect(state.disabled).toBe(true);
  });

  test('isObservabilityDisabled reads persisted value', async () => {
    await storeObservabilityDisabled(configDir, true);
    const disabled = await isObservabilityDisabled(configDir);
    expect(disabled).toBe(true);
  });

  test('getObservabilityGroup returns undefined by default', async () => {
    const group = await getObservabilityGroup(configDir);
    expect(group).toBeUndefined();
  });

  test('storeObservabilityGroup persists and reads back', async () => {
    await storeObservabilityGroup(configDir, 'beta-testers');
    const group = await getObservabilityGroup(configDir);
    expect(group).toBe('beta-testers');
  });

  test('respects DX_DISABLE_OBSERVABILITY env var', async () => {
    process.env.DX_DISABLE_OBSERVABILITY = 'true';
    const disabled = await isObservabilityDisabled(configDir);
    expect(disabled).toBe(true);
  });

  test('respects DX_OBSERVABILITY_GROUP env var on initial creation', async () => {
    process.env.DX_OBSERVABILITY_GROUP = 'alpha';
    const group = await getObservabilityGroup(configDir);
    expect(group).toBe('alpha');
  });

  test('validates UUID in existing state file', async () => {
    await mkdir(configDir, { recursive: true });
    const state: PersistentObservabilityState = {
      installationId: '550e8400-e29b-41d4-a716-446655440000',
      disabled: false,
    };
    await writeFile(join(configDir, 'observability.yml'), yaml.dump(state), 'utf-8');
    const disabled = await isObservabilityDisabled(configDir);
    expect(disabled).toBe(false);
  });

  test('reinitializes if UUID is invalid', async () => {
    await mkdir(configDir, { recursive: true });
    const badState = { installationId: 'not-a-uuid', disabled: true };
    await writeFile(join(configDir, 'observability.yml'), yaml.dump(badState), 'utf-8');

    // Should reinitialize with a fresh UUID.
    await isObservabilityDisabled(configDir);
    const content = await readFile(join(configDir, 'observability.yml'), 'utf-8');
    const state = yaml.load(content) as PersistentObservabilityState;
    expect(validateUuid(state.installationId)).toBe(true);
    // Reinitialized state uses env var defaults, not the persisted bad state.
    expect(state.disabled).toBe(false);
  });

  test('showObservabilityBanner prints once then is silent', async () => {
    await mkdir(configDir, { recursive: true });
    const bannerCb = vi.fn();

    await showObservabilityBanner(configDir, bannerCb);
    expect(bannerCb).toHaveBeenCalledTimes(1);

    bannerCb.mockClear();
    await showObservabilityBanner(configDir, bannerCb);
    expect(bannerCb).not.toHaveBeenCalled();
  });
});
