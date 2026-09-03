//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';

import { readTelemetrySettings, readySettingsSpace, writeTelemetrySettings } from './telemetry-settings';

describe('telemetry settings on the settings space', () => {
  it.effect('reads back what was written and leaves the other field alone', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      const { settingsSpace } = yield* AppSpace.setupIdentitySpaces(client);

      expect(readTelemetrySettings(settingsSpace)).toEqual({ enabled: undefined, aiContentCapture: undefined });
      expect(readySettingsSpace(client)?.id).toBe(settingsSpace.id);

      writeTelemetrySettings(settingsSpace, { aiContentCapture: false });
      expect(readTelemetrySettings(settingsSpace)).toEqual({ enabled: undefined, aiContentCapture: false });

      writeTelemetrySettings(settingsSpace, { enabled: false });
      expect(readTelemetrySettings(settingsSpace)).toEqual({ enabled: false, aiContentCapture: false });
    }).pipe(Effect.provide(TestLayer)),
  );
});
