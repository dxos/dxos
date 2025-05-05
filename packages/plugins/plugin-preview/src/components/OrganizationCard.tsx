//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Organization } from '@dxos/schema';

import { type PreviewProps, previewCard, previewTitle } from '../types';

export const OrganizationCard = ({
  children,
  classNames,
  subject: { name, image, description, website },
}: PreviewProps<Organization>) => {
  return (
    <div role='none' className={mx(previewCard, classNames)}>
      {image ? (
        <img className='aspect-video object-cover is-full bs-auto' src={image} alt={name} />
      ) : (
        <div role='image' className='grid aspect-video place-items-center bg-groupSurface text-subdued'>
          <Icon icon='ph--building-office--regular' size={10} />
        </div>
      )}
      <h2 className={mx(previewTitle, 'pli-3 mlb-3')}>{name}</h2>
      {description && <p className='pli-3 line-clamp-2 mlb-3'>{description}</p>}
      {website && (
        <div role='none'>
          <a className='dx-button is-full dx-focus-ring' href={website} target='_blank' rel='noreferrer'>
            <span className='grow'>{website}</span>
            <Icon icon='ph--arrow-right--regular' />
          </a>
        </div>
      )}
      {children}
    </div>
  );
};
