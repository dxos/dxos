//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';
import { type Project } from '@dxos/schema';

import { type PreviewProps, popoverCard, previewTitle } from '../types';

export const ProjectCard = ({ classNames, subject: { name, image, description } }: PreviewProps<Project>) => {
  return (
    <div role='none' className={mx(popoverCard, classNames)}>
      {image && <img className='is-full bs-auto' src={image} alt={name} />}
      <h2 className={mx(previewTitle, 'pli-3 mlb-3')}>{name}</h2>
      {description && <p className='pli-3 line-clamp-2 mlb-3'>{description}</p>}
    </div>
  );
};
