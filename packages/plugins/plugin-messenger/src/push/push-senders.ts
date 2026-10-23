//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

export type PushSendersOptions = {
  /** The identity DIDs whose notices are worth a push; read on every sync. */
  senders: () => readonly string[];
  /** Uploads the list to EDGE (`PUT /push/senders`), replacing the last one. */
  put: (senders: readonly string[]) => Promise<void>;
};

export type PushSenders = {
  /** Uploads the current list unless it is the one last uploaded; call whenever it may have changed. */
  sync: () => void;
};

/**
 * Keeps EDGE's list of senders worth a push in step with this device's contacts. Uploads never overlap, and a change
 * during one is folded into a single upload after it, so the burst of contact changes at startup costs one or two.
 * A failed upload is retried on the next change or the next start.
 */
export const makePushSenders = ({ senders, put }: PushSendersOptions): PushSenders => {
  let uploaded: string | undefined;
  let running = false;
  let rerun = false;

  const sync = () => {
    if (running) {
      rerun = true;
      return;
    }
    const next = [...new Set(senders())].sort();
    const key = next.join(',');
    if (key === uploaded) {
      return;
    }

    running = true;
    void put(next)
      .then(
        () => {
          uploaded = key;
        },
        (error) => log.warn('failed to upload push senders', { error }),
      )
      .finally(() => {
        running = false;
        if (rerun) {
          rerun = false;
          sync();
        }
      });
  };

  return { sync };
};
