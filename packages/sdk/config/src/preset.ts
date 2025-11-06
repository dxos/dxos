import { Config } from './config';

export type ConfigPresetOptions = {
  /**
   * Edge service.
   * @default main
   */
  edge?: 'local' | 'main';
};

export const configPreset = ({ edge = 'main' }: ConfigPresetOptions = {}) =>
  new Config({
    version: 1,
    runtime: {
      services: {
        edge: { url: edge === 'local' ? 'http://localhost:8787' : 'https://edge-main.dxos.workers.dev' },
      },
    },
  });
