//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';

export const getScreenshare = ({ contentHint }: { contentHint: string }) =>
  navigator.mediaDevices
    .getDisplayMedia()
    .then((ms) => {
      ms.getVideoTracks().forEach((track) => {
        if (contentHint && 'contentHint' in track) {
          track.contentHint = contentHint;
        }
      });

      return ms;
    })
    .catch((err) => log.catch(err));
