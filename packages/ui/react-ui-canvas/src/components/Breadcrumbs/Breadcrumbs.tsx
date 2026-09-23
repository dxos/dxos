//
// Copyright 2026 DXOS.org
//

import React, { Fragment } from 'react';

import { Button } from '@dxos/react-ui';

import { type SceneId } from '../../model/index.ts';

export type BreadcrumbsProps = {
  path: SceneId[];
  nameOf: (id: SceneId) => string;
  /** Jump to the scene at `index` of the path (drill-out by several levels at once). */
  onSelect: (index: number) => void;
};

// TODO(burdon): Reconcile with react-ui.
export const Breadcrumbs = ({ path, nameOf, onSelect }: BreadcrumbsProps) => (
  <nav className='flex items-center gap-1 text-sm font-mono'>
    {path.map((id, index) => (
      <Fragment key={`${index}:${id}`}>
        {index > 0 && <span className='text-subdued'>›</span>}
        <Button variant='ghost' density='sm' disabled={index === path.length - 1} onClick={() => onSelect(index)}>
          {nameOf(id)}
        </Button>
      </Fragment>
    ))}
  </nav>
);
