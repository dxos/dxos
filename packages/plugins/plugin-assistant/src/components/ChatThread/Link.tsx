//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Space } from '@dxos/client/echo';
import { Entity } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { DxAnchor } from '@dxos/lit-ui/react';

export type ObjectLinkProps = {
  space: Space;
  dxn: URI.URI;
};

export const ObjectLink = ({ space, dxn }: ObjectLinkProps) => {
  const ref = useMemo(() => space.db.makeRef(dxn), [space, dxn]);

  const title = (ref.target && Entity.getLabel(ref.target)) ?? ref.target?.id ?? ref.uri;
  return (
    <DxAnchor rootclassname='dx-tag--anchor' dxn={dxn}>
      {title}
    </DxAnchor>
  );
};
