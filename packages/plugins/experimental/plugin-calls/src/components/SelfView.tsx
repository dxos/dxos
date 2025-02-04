//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { VideoObject, type VideoObjectProps } from './VideoObject';

export const SelfView = forwardRef<HTMLVideoElement, VideoObjectProps>(({ className, ...rest }, ref) => (
  <VideoObject className={mx('-scale-x-100', className)} muted {...rest} ref={ref} />
));

SelfView.displayName = 'SelfView';
