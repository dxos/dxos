//
// Copyright 2026 DXOS.org
//

// Surface components that call hooks; a `props` mapper is a plain function, not a component.

import React from 'react';

import { useOptionalAtomCapability } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { StreamDeckStatus } from '#components';
import { StreamDeckDashboard } from '#containers';
import { StreamDeckCapabilities } from '#types';

/** The dashboard is scoped to the active space rather than to a subject. */
export const StreamDeckDashboardSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return (
    <StreamDeckDashboard role={AppSurface.deckCompanion('streamDeck').role} space={space} attendableId={space.id} />
  );
};

/** Renders nothing unless a device is actually connected — see {@link StreamDeckStatus}. */
export const StreamDeckStatusSurface = () => {
  const status = useOptionalAtomCapability(StreamDeckCapabilities.BridgeStatus);
  return status?.state === 'connected' ? <StreamDeckStatus model={status.device?.model} /> : null;
};
