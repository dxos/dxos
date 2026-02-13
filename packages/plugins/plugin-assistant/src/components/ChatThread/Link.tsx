//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Space } from '@dxos/client/echo';
import { Entity } from '@dxos/echo';
import { type DXN } from '@dxos/keys';
import { DxAnchor } from '@dxos/lit-ui/react';

export type ObjectLinkProps = {
  space: Space;
  dxn: DXN;
};

export const ObjectLink = ({ space, dxn }: ObjectLinkProps) => {
  const ref = useMemo(() => space.db.makeRef(dxn), [space, dxn.toString()]);

  const title = (ref.target && Entity.getLabel(ref.target)) ?? ref.target?.id ?? ref.dxn.toString();
  return (
    <DxAnchor rootclassname='dx-tag--anchor' dxn={dxn.toString()}>
      {title}
    </DxAnchor>
  );
};
