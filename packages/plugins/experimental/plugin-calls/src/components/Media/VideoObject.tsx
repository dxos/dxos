//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useEffect, useRef } from 'react';

import { mx } from '@dxos/react-ui-theme';

export type VideoObjectProps = Omit<JSX.IntrinsicElements['video'], 'ref'> & {
  videoTrack?: MediaStreamTrack;
  flip?: boolean;
  // TODO(burdon): If screenshare then contain.
  contain?: boolean;
};

export const VideoObject = forwardRef<HTMLVideoElement, VideoObjectProps>(
  ({ videoTrack, className, flip, contain, ...rest }, ref) => {
    const internalRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const mediaStream = new MediaStream();
      if (videoTrack) {
        mediaStream.addTrack(videoTrack);
      }

      const video = internalRef.current;
      if (video) {
        video.srcObject = mediaStream;
        video.setAttribute('autoplay', 'true');
        video.setAttribute('playsinline', 'true');
      }

      return () => {
        if (videoTrack) {
          mediaStream.removeTrack(videoTrack);
        }

        const video = internalRef.current;
        if (video) {
          video.srcObject = null;
        }
      };
    }, [videoTrack]);

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
