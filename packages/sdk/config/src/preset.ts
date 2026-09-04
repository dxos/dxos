//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';

import { Config } from './config';
import { EDGE_URLS } from './edge-services';

export type ConfigPresetOptions = {
  /**
   * Edge service.
   * @default preview
   */
  edge?: 'local' | 'dev' | 'preview' | 'main' | 'production';

  /**
   * Sandbox service. Only `local` sets anything: every deployed sandbox-service is reached as
   * `<edge>/sandbox`, so `edge` above already configures it.
   */
  sandbox?: 'local' | 'dev' | 'main' | 'production';
};

const edgeUrl = (edge: NonNullable<ConfigPresetOptions['edge']>) =>
  Match.value(edge).pipe(
    Match.when('local', () => 'http://localhost:8787'),
    Match.when('dev', () => EDGE_URLS.dev),
    // Preserve `main` as a deprecated alias for existing profiles.
    Match.when('preview', () => EDGE_URLS.preview),
    Match.when('main', () => EDGE_URLS.preview),
    Match.when('production', () => EDGE_URLS.production),
    Match.exhaustive,
  );

// `undefined` for every deployed environment: `runtime.services.sandbox.url` is the override for a
// worker that is NOT behind EDGE, and leaving it unset is what makes the client derive `<edge>/sandbox`.
const sandboxUrl = (sandbox: NonNullable<ConfigPresetOptions['sandbox']>): string | undefined =>
  Match.value(sandbox).pipe(
    Match.when('local', () => 'http://localhost:8792'),
    Match.orElse(() => undefined),
  );

export const configPreset = ({ edge = 'preview', sandbox }: ConfigPresetOptions = {}) => {
  const sandboxOverride = sandbox && sandboxUrl(sandbox);
  return new Config({
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
        ...(sandboxOverride ? { sandbox: { url: sandboxOverride } } : {}),
      },
    },
  });
};
