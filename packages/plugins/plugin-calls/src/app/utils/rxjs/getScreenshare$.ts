//
// Copyright 2024 DXOS.org
//

import { Observable, shareReplay } from 'rxjs';
import invariant from 'tiny-invariant';

export const getScreenshare$ = ({ contentHint }: { contentHint: string }) =>
  new Observable<MediaStream | undefined>((subscribe) => {
    let cleanup: Function = () => {};
    // do this in a setTimeout that we can cancel
    // so it will play nicely with React strict mode
    const timeout = setTimeout(() => {
      navigator.mediaDevices
        .getDisplayMedia()
        .then((ms) => {
          cleanup = () => {
            ms.getTracks().forEach((t) => t.stop());
          };
          ms.getVideoTracks().forEach((track) => {
            if (contentHint && 'contentHint' in track) {
              track.contentHint = contentHint;
            }
          });

          subscribe.next(ms);
          ms.getVideoTracks()[0].addEventListener('ended', () => {
            subscribe.complete();
          });
        })
        .catch((err) => {
          invariant(err instanceof Error);
          // user cancelled the screenshare request
          if (err.name === 'NotAllowedError') {
            subscribe.next(undefined);
            return;
          }
          throw err;
        });
    });

    return () => {
      clearTimeout(timeout);
      cleanup();
    };
  }).pipe(
    shareReplay({
      refCount: true,
      bufferSize: 1,
    }),
  );
