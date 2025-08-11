//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { type DXN } from '@dxos/keys';
import { mx } from '@dxos/react-ui-theme';

import { useResolvedRef } from '../../hooks';

export type ObjectLinkProps = {
  space: Space;
  dxn: DXN;
};

// TODO(burdon): Factor out.
export const ObjectLink = ({ space, dxn }: ObjectLinkProps) => {
  const object = useResolvedRef(space, Ref.fromDXN(dxn));
  const title = Obj.getLabel(object) ?? object?.id ?? dxn.toString();

  return (
    <a
      // href={dxn.toString()}
      title={title}
      className={mx(
        'inline-flex items-center max-w-[16rem] px-2 py-0.5 overflow-hidden',
        // TODO(burdon): Use style for tags.
        'border border-separator rounded whitespace-nowrap text-ellipsis text-primary-500 hover:text-primary-500 hover:border-primary-500',
      )}
      target='_blank'
      rel='noopener noreferrer'
    >
      <span className='truncate'>{title}</span>
    </a>
  );
};
