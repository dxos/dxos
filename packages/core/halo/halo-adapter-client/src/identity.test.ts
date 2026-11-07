//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { DeviceSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { DeviceProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { toDeviceInfo } from './identity.ts';

const makeDevice = (label?: string) =>
  create(DeviceSchema, {
    deviceKey: fromPublicKey(PublicKey.random()),
    profile: create(DeviceProfileDocumentSchema, { label, platform: 'Chrome', os: 'macOS' }),
  });

describe('toDeviceInfo', () => {
  test('reports the placeholders older clients wrote as no label', ({ expect }) => {
    expect(toDeviceInfo(makeDevice('initial identity device')).label).toBeUndefined();
    expect(toDeviceInfo(makeDevice('additional device')).label).toBeUndefined();
    expect(toDeviceInfo(makeDevice('Work laptop')).label).toBe('Work laptop');
  });
});
