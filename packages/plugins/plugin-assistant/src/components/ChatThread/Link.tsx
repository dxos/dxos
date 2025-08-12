//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { type DXN } from '@dxos/keys';
import { DxRefTag } from '@dxos/lit-ui/react';

import { useResolvedRef } from '../../hooks';

export type ObjectLinkProps = {
  space: Space;
  dxn: DXN;
};

// TODO(thure): Have CM render `<dx-ref-tag ref="{dxn}">{title}</dx-ref-tag>, this is why we established this
//   lower-level webcomponent. CM should not need to render react roots except to access the app framework’s `Surface`.
export const ObjectLink = ({ space, dxn }: ObjectLinkProps) => {
  const object = useResolvedRef(space, Ref.fromDXN(dxn));
  const title = Obj.getLabel(object) ?? object?.id ?? dxn.toString();
  return <DxRefTag refid={dxn.toString()}>{title}</DxRefTag>;
};
