//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useEffect, useRef } from 'react';

import { mx } from '@dxos/react-ui-theme';

export type VideoObjectProps = Omit<JSX.IntrinsicElements['video'], 'ref'> & {
  videoStream?: MediaStream;
  flip?: boolean;
  // TODO(burdon): If screenshare then contain.
  contain?: boolean;
};

export const VideoObject = forwardRef<HTMLVideoElement, VideoObjectProps>(
  ({ videoStream, className, flip, contain, ...rest }, ref) => {
    const internalRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const video = internalRef.current;
      if (video && videoStream) {
        video.srcObject = videoStream;
        video.setAttribute('autoplay', 'true');
        video.setAttribute('playsinline', 'true');
      }
    }, [videoStream, internalRef.current]);

    return (
      <video
        className={mx(
          'is-full aspect-video',
          flip && 'scale-x-[-1]',
          contain ? 'object-contain' : 'object-cover',
          className,
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
  },
);

VideoObject.displayName = 'VideoObject';
