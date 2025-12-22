//
// Copyright 2024 DXOS.org
//

import React, { type JSX, forwardRef, memo, useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type VideoObjectProps = Omit<JSX.IntrinsicElements['video'], 'className' | 'ref'> &
  ThemedClassName<{
    videoStream?: MediaStream;
    flip?: boolean;
    // TODO(burdon): If screenshare then contain.
    contain?: boolean;
  }>;

export const VideoObject = memo(
  forwardRef<HTMLVideoElement, VideoObjectProps>(({ videoStream, classNames, flip, contain, ...rest }, ref) => {
    const internalRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const video = internalRef.current;
      if (video && videoStream) {
        video.srcObject = videoStream;
        video.setAttribute('autoplay', 'true');
        video.setAttribute('playsinline', 'true');
      }
    }, [videoStream, internalRef.current]);

    // NOTE: The video element typically has a max size of 1280x720.
    return (
      <video
        className={mx(
          'is-full aspect-video',
          flip && 'scale-x-[-1]',
          contain ? 'object-contain' : 'object-cover',
          classNames,
        )}
        ref={(v) => {
          internalRef.current = v;
          if (ref === null) {
            return;
          }

          if (typeof ref === 'function') {
            ref(v);
          } else {
            ref.current = v;
          }
        }}
        {...rest}
      />
    );
  }),
);

VideoObject.displayName = 'VideoObject';
