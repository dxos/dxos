//
// Copyright 2024 DXOS.org
//

import { ArrowsCounterClockwise, CheckCircle, Warning } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { debounce } from '@dxos/async';
import { type EchoDatabase } from '@dxos/react-client/echo';
import { Tooltip, useTranslation } from '@dxos/react-ui';
import { getSize, mx, staticPlaceholderText, warningText } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';

enum Status {
  PERSISTED_LOCALLY = 0,
  PENDING = 1,
  ERROR = 2,
}

export const PersistenceStatus = ({ db }: { db: EchoDatabase }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const [displayMessage, setDisplayMessage] = useState(false);
  const [status, naturalSetStatus] = useState<Status>(Status.PERSISTED_LOCALLY);
  const [prevStatus, setPrevStatus] = useState<Status>(Status.PERSISTED_LOCALLY);
  const _setStatus = debounce(naturalSetStatus, 500);

  // TODO(dmaretskyi): Fix this when we have save status for automerge.
  // useEffect(() => {
  //   return db.pendingBatch.on(({ duration, error }) => {
  //     if (error) {
  //       setStatus(Status.ERROR);
  //     } else if (duration === undefined) {
  //       setStatus(Status.PENDING);
  //     } else {
  //       setStatus(Status.PERSISTED_LOCALLY);
  //     }
  //   });
  // }, [db]);

  useEffect(() => {
    // If this is changed outside the effect it's batched with setStatus and the following condition will never be true.
    setPrevStatus(status);

    if (prevStatus !== status && status === Status.PERSISTED_LOCALLY) {
      setDisplayMessage(true);
      const timeout = setTimeout(() => setDisplayMessage(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [status]); // `prevStatus` omitted from dependency array to prevent timeout from being reset.

  switch (status) {
    case Status.ERROR:
      return (
        <div className='flex items-center'>
          <Warning className={mx(getSize(4), 'me-1')} />
          <span className={mx('text-sm', warningText)}>{t('persistence error label')}</span>
        </div>
      );
    case Status.PENDING:
      return (
        <div className='flex items-center'>
          <ArrowsCounterClockwise className={mx(getSize(4), 'me-1')} />
          <span className={mx('text-sm', staticPlaceholderText)}>{t('persistence pending label')}</span>
        </div>
      );
    case Status.PERSISTED_LOCALLY:
    default:
      return (
        <Tooltip.Root delayDuration={400}>
          <Tooltip.Trigger role='status' className='flex items-center'>
            <CheckCircle className={mx(getSize(4), 'me-1')} />
            {displayMessage && (
              <span className={mx('text-sm', staticPlaceholderText)}>{t('persisted locally label')}</span>
            )}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content classNames='z-10'>
              {t('persisted locally message')}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      );
  }
};
