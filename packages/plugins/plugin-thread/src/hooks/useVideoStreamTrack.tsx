//
// Copyright 2025 DXOS.org
//

import { type RefObject, useEffect, useRef, useState } from 'react';

export const useVideoStreamTrack = (videoElement: RefObject<HTMLVideoElement>, videoSrc: string) => {
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
      const stream = (videoElement.current as any).captureStream();
      const track = stream.getTracks()[0];
      if (track) {
        setVideoStreamTrack(track);
      }
      stream.onaddtrack = (event: MediaStreamTrackEvent) => {
        if (event.track.kind === 'video') {
          setVideoStreamTrack(event.track);
        }
      };
    });
    videoElement.current.src = videoSrc;
  }, [videoElement.current, videoSrc]);

  return videoStreamTrack;
};
