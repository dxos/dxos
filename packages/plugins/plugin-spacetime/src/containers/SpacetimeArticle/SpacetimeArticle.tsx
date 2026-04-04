//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { SpacetimeEditor } from '../../components';

export type SpacetimeArticleProps = {
  subject: unknown;
  role?: string;
};

const SpacetimeArticle = ({ role }: SpacetimeArticleProps) => {
  return (
    <div role={role} className='flex w-full h-full overflow-hidden'>
      <SpacetimeEditor className='w-full h-full' />
    </div>
  );
};

export default SpacetimeArticle;
