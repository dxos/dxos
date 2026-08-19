//
// Copyright 2026 DXOS.org
//

// Surface components that call hooks; a `props` mapper is a plain function, not a component.

import React from 'react';

import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { StreamDeckDashboard } from '#containers';

/** The dashboard is scoped to the active space rather than to a subject object. */
export const StreamDeckDashboardSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return (
    <StreamDeckDashboard role={AppSurface.deckCompanion('streamDeck').role} space={space} attendableId={space.id} />
  );
};
