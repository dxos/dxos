//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Organization } from '@dxos/schema';

import { type PreviewProps, previewCard, previewTitle, previewProse, previewChrome } from '../types';

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
      <h2 className={mx(previewTitle, previewProse)}>{name}</h2>
      {description && <p className={mx(previewProse, 'line-clamp-2')}>{description}</p>}
      {website && (
        <div role='none' className={previewChrome}>
          <a className='dx-button dx-focus-ring gap-2' href={website} target='_blank' rel='noreferrer'>
            <Icon icon='ph--link--regular' size={5} classNames='text-subdued' />
            <span className='grow'>{website}</span>
            <Icon icon='ph--arrow-right--regular' />
          </a>
        </div>
      )}
      {children}
    </div>
  );
};
