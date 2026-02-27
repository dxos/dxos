//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';

import { create } from '@dxos/protocols/buf';
import {
  ConfigSchema,
  RuntimeSchema,
  Runtime_ClientSchema,
  Runtime_Client_EdgeFeaturesSchema,
  Runtime_ServicesSchema,
  Runtime_Services_EdgeSchema,
} from '@dxos/protocols/buf/dxos/config_pb';

import { Config } from './config';

export type ConfigPresetOptions = {
  /**
   * Edge service.
   * @default main
   */
  edge?: 'local' | 'dev' | 'main' | 'production';
};

export const configPreset = ({ edge = 'main' }: ConfigPresetOptions = {}) =>
  new Config(
    create(ConfigSchema, {
      version: 1,
      runtime: create(RuntimeSchema, {
        client: create(Runtime_ClientSchema, {
          edgeFeatures: create(Runtime_Client_EdgeFeaturesSchema, {
            signaling: true,
            echoReplicator: true,
            feedReplicator: true,
          }),
        }),
        services: create(Runtime_ServicesSchema, {
          edge: create(Runtime_Services_EdgeSchema, {
            url: Match.value(edge).pipe(
              Match.when('local', () => 'http://localhost:8787'),
              Match.when('dev', () => 'https://edge.dxos.workers.dev'),
              Match.when('main', () => 'https://edge-main.dxos.workers.dev'),
              Match.when('production', () => 'https://edge-production.dxos.workers.dev'),
              Match.exhaustive,
            ),
          }),
        }),
      }),
    }),
  );
