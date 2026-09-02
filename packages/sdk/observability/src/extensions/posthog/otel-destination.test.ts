//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Config } from '@dxos/config';

import { signalUrl } from '../otel/otel';
import { otelDestination } from './otel-destination';

const config = (env: Record<string, string>) => new Config({ runtime: { app: { env } } });

const FULL_ENV = { DX_POSTHOG_API_HOST: 'https://o.composer.space', DX_POSTHOG_API_KEY: 'phc_test' };

describe('otelDestination', () => {
  test('authenticates with the project token', ({ expect }) => {
    expect(otelDestination(config(FULL_ENV))?.headers).toEqual({ Authorization: 'Bearer phc_test' });
  });

  test('each signal resolves under the /i prefix', ({ expect }) => {
    const destination = otelDestination(config(FULL_ENV))!;
    expect(signalUrl(destination, 'logs')).toEqual('https://o.composer.space/i/v1/logs');
    expect(signalUrl(destination, 'metrics')).toEqual('https://o.composer.space/i/v1/metrics');
    expect(signalUrl(destination, 'traces')).toEqual('https://o.composer.space/i/v1/traces');
  });

  test('a trailing slash on the host does not double up', ({ expect }) => {
    const destination = otelDestination(config({ ...FULL_ENV, DX_POSTHOG_API_HOST: 'https://o.composer.space/' }))!;
    expect(signalUrl(destination, 'logs')).toEqual('https://o.composer.space/i/v1/logs');
  });

  test('absent unless both the host and the token are configured', ({ expect }) => {
    expect(otelDestination(config({}))).toBeUndefined();
    expect(otelDestination(config({ DX_POSTHOG_API_KEY: 'phc_test' }))).toBeUndefined();
    expect(otelDestination(config({ DX_POSTHOG_API_HOST: 'https://o.composer.space' }))).toBeUndefined();
  });
});
