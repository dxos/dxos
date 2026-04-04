//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';

import { SpacetimeEditor } from '../../components';
import { type Spacetime, type Settings } from '../../types';

export type SpacetimeArticleProps = ObjectSurfaceProps<
  Spacetime.Scene,
  {
    settings?: Settings.Settings | null;
  }
>;

const SpacetimeArticle = ({ role, settings }: SpacetimeArticleProps) => {
  const showAxes = settings?.showAxes === true;
  const showFps = settings?.showFps === true;

  return (
    <div role={role} className='flex w-full h-full overflow-hidden'>
      <SpacetimeEditor classNames='w-full h-full' showAxes={showAxes} showFps={showFps} />
    </div>
  );
};

export default SpacetimeArticle;
