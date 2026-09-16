//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { EID } from '@dxos/keys';
import { useSpace } from '@dxos/react-client/echo';

import { ObjectCard } from '#components';

export type ObjectCardSurfaceProps = {
  /** The object's URI, as the model wrote it in `<surface role='card' data='{"id":…}'>`. */
  id?: string;
};

/**
 * The `card` chat surface: an object, named by URI, as its card. The model reaches for a
 * `<surface>` block to show an object at least as readily as for a markdown embed, so both forms
 * land on the same card. Resolved against the URI's space when it names one, else the active space.
 */
export const ObjectCardSurface = ({ id }: ObjectCardSurfaceProps) => {
  const eid = id ? EID.tryParse(id) : undefined;
  const spaceId = eid && EID.getSpaceId(eid);
  const named = useSpace(spaceId);
  const active = useActiveSpace();
  const db = (named ?? active)?.db;
  if (!eid) {
    return null;
  }

  return <ObjectCard eid={eid} db={db} />;
};

ObjectCardSurface.displayName = 'ObjectCardSurface';

export default ObjectCardSurface;
