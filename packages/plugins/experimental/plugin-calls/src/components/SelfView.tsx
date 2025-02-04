//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { VideoObject, type VideoObjectProps } from './VideoObject';
import { cn } from './utils';

export const SelfView = forwardRef<HTMLVideoElement, VideoObjectProps>(({ className, ...rest }, ref) => (
  <VideoObject className={cn('-scale-x-100', className)} muted {...rest} ref={ref} />
));

SelfView.displayName = 'SelfView';
