//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';

import { Config } from './config';

export type ConfigPresetOptions = {
  /**
   * Edge service.
   * @default main
   */
  edge?: 'local' | 'dev' | 'preview' | 'main' | 'production';

  /**
   * Sandbox service (standalone worker; API at /api/sandbox).
   */
  sandbox?: 'local' | 'dev' | 'main' | 'production';
};

const edgeUrl = (edge: NonNullable<ConfigPresetOptions['edge']>) =>
  Match.value(edge).pipe(
    Match.when('local', () => 'http://localhost:8787'),
    Match.when('dev', () => 'https://edge.dxos.workers.dev'),
    // Preserve `main` as a deprecated alias for existing profiles.
    Match.when('preview', () => 'https://preview.dxos.network'),
    Match.when('main', () => 'https://preview.dxos.network'),
    Match.when('production', () => 'https://dxos.network'),
    Match.exhaustive,
  );

// TODO(burdon): Hosted environments share a single worker until per-env deployments exist.
const sandboxUrl = (sandbox: NonNullable<ConfigPresetOptions['sandbox']>) =>
  Match.value(sandbox).pipe(
    Match.when('local', () => 'http://localhost:8792'),
    Match.when('dev', () => 'https://sandbox-service.dxos.workers.dev'),
    Match.when('main', () => 'https://sandbox-service.dxos.workers.dev'),
    Match.when('production', () => 'https://sandbox-service.dxos.workers.dev'),
    Match.exhaustive,
  );

export const configPreset = ({ edge = 'main', sandbox }: ConfigPresetOptions = {}) =>
  new Config({
    version: 1,
    runtime: {
      client: {
        edgeFeatures: {
          signaling: true,
          subductionReplicator: true,
          feedReplicator: true,
        },
      },
      services: {
        edge: {
          url: edgeUrl(edge),
        },
        ...(sandbox ? { sandbox: { url: sandboxUrl(sandbox) } } : {}),
      },
    },
  });
