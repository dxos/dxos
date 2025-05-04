//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Project } from '@dxos/schema';

export type ProjectCardProps = { subject: Project };

export const ProjectCard = ({ subject: { name, image, description } }: ProjectCardProps) => {
  return (
    <div role='none' className='is-72'>
      {image && <img className='aspect-video object-cover is-full bs-auto' src={image} alt={name} />}
      <h2 className='font-medium text-lg line-clamp-2 pli-3 mlb-3'>{name}</h2>
      {description && <p className='pli-3 line-clamp-2 mlb-3'>{description}</p>}
    </div>
  );
};
