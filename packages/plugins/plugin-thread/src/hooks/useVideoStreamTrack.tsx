//
// Copyright 2025 DXOS.org
//

import { type RefObject, useEffect, useRef, useState } from 'react';

export const useVideoStreamTrack = (videoElement: RefObject<HTMLVideoElement | null>, videoSrc: string) => {
  // Get video stream track.
  const [videoStreamTrack, setVideoStreamTrack] = useState<MediaStreamTrack | undefined>(undefined);
  const hadRun = useRef(false);
  useEffect(() => {
    // This is done to capture only one video stream.
    if (!videoElement.current || hadRun.current || !videoSrc) {
      return;
    }
    hadRun.current = true;
    videoElement.current.addEventListener('playing', () => {
      if (videoStreamTrack) {
        return;
      }
      const stream = (videoElement.current as any).captureStream();
      const track = stream.getTracks()[0];
      if (track && !videoStreamTrack) {
        setVideoStreamTrack(track);
      }
      stream.onaddtrack = (event: MediaStreamTrackEvent) => {
        if (event.track.kind === 'video' && !videoStreamTrack) {
          setVideoStreamTrack(event.track);
        }
      };
    });
    videoElement.current.src = videoSrc;
  }, [videoElement.current, videoSrc]);

  return videoStreamTrack;
};
