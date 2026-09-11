//
// Copyright 2026 DXOS.org
//

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, test, vi } from 'vitest';

import { CHANNEL_COLORS, CHANNELS, RAMP_HUE } from '@dxos/brand/channels';

import { applyChannelFavicons, bootMarkFilter, channelVariant } from './channel-branding.ts';

const FAVICONS = [
  'favicon.svg',
  'favicon-96x96.png',
  'apple-touch-icon.png',
  'favicon.ico',
  'web-app-manifest-192x192.png',
  'web-app-manifest-512x512.png',
];

const scratches: string[] = [];

afterEach(() => {
  scratches.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  vi.unstubAllEnvs();
});

describe('channelVariant', () => {
  test('production ships the released mark', ({ expect }) => {
    expect(channelVariant('build', 'production')).toBeUndefined();
  });

  test('the e2e bundle is not a deploy, so it ships the released mark', ({ expect }) => {
    expect(channelVariant('build', 'ci')).toBeUndefined();
  });

  test('an unset environment is a local build, not a channel', ({ expect }) => {
    // `environment` defaults to `process.env.DX_ENVIRONMENT`, so passing `undefined` reads the
    // ambient value — a developer who exports one (a machine name, say) fails this otherwise.
    vi.stubEnv('DX_ENVIRONMENT', '');
    expect(channelVariant('build', '')).toBeUndefined();
    expect(channelVariant('build', undefined)).toBeUndefined();
  });

  test('a prerelease channel is named by its environment', ({ expect }) => {
    expect(channelVariant('build', 'preview')).toEqual('preview');
    expect(channelVariant('build', 'dev')).toEqual('dev');
    expect(channelVariant('build', 'staging')).toEqual('staging');
  });

  test('an environment with no artwork fails the build rather than shipping the released mark', ({ expect }) => {
    expect(() => channelVariant('build', 'labs')).toThrow(/unknown environment: labs/);
  });

  // Only a deployed bundle is branded, so `DX_ENVIRONMENT` in a shell does not repaint localhost.
  test('a dev server keeps the released mark whatever the environment says', ({ expect }) => {
    expect(channelVariant('serve', 'preview')).toBeUndefined();
    expect(channelVariant('serve', 'dev')).toBeUndefined();
  });
});

describe('bootMarkFilter', () => {
  test('leaves the released mark alone when there is no channel', ({ expect }) => {
    expect(bootMarkFilter(undefined)).toBeUndefined();
  });

  // The colours are the brand's to set, so the test pins the derivation rather than the numbers.
  test('rotates the ramp to the channel hue, scaling saturation only when the channel does', ({ expect }) => {
    for (const channel of CHANNELS) {
      const { hue, saturation } = CHANNEL_COLORS[channel];
      const rotate = (((hue - RAMP_HUE) % 360) + 360) % 360;
      expect(bootMarkFilter(channel)).toBe(
        saturation === 1 ? `hue-rotate(${rotate}deg)` : `hue-rotate(${rotate}deg) saturate(${saturation})`,
      );
    }
  });
});

// The artwork is generated and committed, so a channel added without re-running `pnpm icons:variants`
// would otherwise only surface as a failed deploy.
describe('generated artwork', () => {
  const appDir = path.resolve(import.meta.dirname, '..', '..');

  for (const variant of ['dev', 'preview', 'staging'] as const) {
    test(`${variant} is committed in full`, ({ expect }) => {
      const missing = FAVICONS.map((favicon) => path.join(appDir, 'assets', `favicons-${variant}`, favicon)).filter(
        (file) => !existsSync(file),
      );
      expect(missing).toEqual([]);
    });
  }
});

describe('applyChannelFavicons', () => {
  test('replaces every favicon the html references', ({ expect }) => {
    const { appDir, outDir } = makeApp('dev');

    applyChannelFavicons(appDir, outDir, 'dev');

    for (const favicon of FAVICONS) {
      expect(readFileSync(path.join(outDir, favicon), 'utf8')).toEqual(`dev:${favicon}`);
    }
  });

  test('leaves the released favicons alone when there is no channel', ({ expect }) => {
    const { appDir, outDir } = makeApp('dev');

    applyChannelFavicons(appDir, outDir, undefined);

    for (const favicon of FAVICONS) {
      expect(readFileSync(path.join(outDir, favicon), 'utf8')).toEqual(`production:${favicon}`);
    }
  });

  // Shipping production's blue mark on a prerelease is the confusion this exists to prevent, so a variant
  // that was never generated has to fail the build rather than silently fall through to it.
  test('fails the build when the variant artwork is missing', ({ expect }) => {
    const { appDir, outDir } = makeApp('dev');
    rmSync(path.join(appDir, 'assets', 'favicons-dev', 'favicon.ico'));

    expect(() => applyChannelFavicons(appDir, outDir, 'dev')).toThrow('channel favicon missing');
  });
});

/** An app directory with generated variant artwork and an out directory holding the released favicons. */
const makeApp = (variant: string) => {
  const appDir = mkdtempSync(path.join(tmpdir(), 'channel-branding-'));
  scratches.push(appDir);
  const variantDir = path.join(appDir, 'assets', `favicons-${variant}`);
  const outDir = path.join(appDir, 'out', 'composer');
  mkdirSync(variantDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  for (const favicon of FAVICONS) {
    writeFileSync(path.join(variantDir, favicon), `${variant}:${favicon}`);
    writeFileSync(path.join(outDir, favicon), `production:${favicon}`);
  }
  return { appDir, outDir };
};
