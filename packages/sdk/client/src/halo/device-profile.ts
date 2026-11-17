//
// Copyright 2026 DXOS.org
//

import { type DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/** Placeholders older clients wrote as a device's label, for its first and later devices; they name nothing. */
const PLACEHOLDER_LABELS = new Set(['initial identity device', 'additional device']);

/** The label someone gave the device, if any; callers name an unlabelled device from its platform and OS. */
export const getDeviceLabel = (profile?: Pick<DeviceProfileDocument, 'label'>): string | undefined =>
  profile?.label && !PLACEHOLDER_LABELS.has(profile.label) ? profile.label : undefined;
