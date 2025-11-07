//
// Copyright 2025 DXOS.org
//

import { Config } from './config';
import { Match } from 'effect';

export type ConfigPresetOptions = {
  /**
   * Edge service.
   * @default main
   */
  edge?: 'local' | 'dev' | 'main';
};

export const configPreset = ({ edge = 'main' }: ConfigPresetOptions = {}) =>
  new Config({
    version: 1,
    runtime: {
      services: {
        edge: {
          url: Match.value(edge).pipe(
            Match.when('local', () => 'http://localhost:8787'),
            Match.when('dev', () => 'https://edge.dxos.workers.dev'),
            Match.when('main', () => 'https://edge-main.dxos.workers.dev'),
            Match.exhaustive,
          ),
        },
      },
    },
  });
