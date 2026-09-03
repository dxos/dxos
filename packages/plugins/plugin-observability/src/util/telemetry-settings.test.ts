//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';

import { readTelemetryEnabled, readySettingsSpace, writeTelemetryEnabled } from './telemetry-settings';

describe('telemetry opt-in on the settings space', () => {
  it.effect('is unset until written, then reads back', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      const { settingsSpace } = yield* AppSpace.setupIdentitySpaces(client);

      expect(readTelemetryEnabled(settingsSpace)).toBeUndefined();
      expect(readySettingsSpace(client)?.id).toBe(settingsSpace.id);

      writeTelemetryEnabled(settingsSpace, false);
      expect(readTelemetryEnabled(settingsSpace)).toBe(false);
    }).pipe(Effect.provide(TestLayer)),
  );
});
