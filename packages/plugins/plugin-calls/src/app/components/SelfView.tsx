//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import type { VideoSrcObjectProps } from './VideoSrcObject';
import { VideoSrcObject } from './VideoSrcObject';
import { cn } from '../utils/style';

export const SelfView = forwardRef<HTMLVideoElement, VideoSrcObjectProps>(({ className, ...rest }, ref) => (
  <VideoSrcObject className={cn('-scale-x-100', className)} muted {...rest} ref={ref} />
));

SelfView.displayName = 'SelfView';
