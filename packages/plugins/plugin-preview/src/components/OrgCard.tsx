//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { type Testing } from '@dxos/schema/testing';

export type OrgCardProps = { subject: Testing.Org };

export const OrgCard = ({ subject: { name, image, description, website } }: OrgCardProps) => {
  return (
    <div role='none' className='is-72'>
      {image ? (
        <img className='aspect-video object-cover is-full bs-auto' src={image} alt={name} />
      ) : (
        <div role='image' className='grid aspect-video bg-unAccent place-items-center'>
          <Icon icon='ph--buildings--regular' size={8} />
        </div>
      )}
      <h2 className='font-medium text-lg line-clamp-2 pli-3 mlb-3'>{name}</h2>
      {description && <p className='pli-3 line-clamp-2 mlb-3'>{description}</p>}
      <div role='none' className='pli-3 pbe-3'>
        <a className='dx-button is-full dx-focus-ring' href={website} target='_blank' rel='noreferrer'>
          <span className='grow'>{website}</span>
          <Icon icon='ph--arrow-right--regular' />
        </a>
      </div>
    </div>
  );
};
