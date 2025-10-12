//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { debounce } from '@dxos/async';
import { type EchoDatabase } from '@dxos/react-client/echo';
import { Icon, Tooltip, useTranslation } from '@dxos/react-ui';
import { mx, staticPlaceholderText, warningText } from '@dxos/react-ui-theme';

import { meta } from '../meta';

enum Status {
  PERSISTED_LOCALLY = 0,
  PENDING = 1,
  ERROR = 2,
}

// TODO(zan): This now has no usages. Remove it?
export const PersistenceStatus = ({ db }: { db: EchoDatabase }) => {
  const { t } = useTranslation(meta.id);
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
          <Icon icon='ph--warning--regular' size={4} classNames='me-1' />
          <span className={mx('text-sm', warningText)}>{t('persistence error label')}</span>
        </div>
      );
    case Status.PENDING:
      return (
        <div className='flex items-center'>
          <Icon icon='ph--arrows-counter-clockwise--regular' size={4} classNames='me-1' />
          <span className={mx('text-sm', staticPlaceholderText)}>{t('persistence pending label')}</span>
        </div>
      );
    case Status.PERSISTED_LOCALLY:
    default:
      return (
        <Tooltip.Trigger
          delayDuration={400}
          role='status'
          content={t('persisted locally message')}
          className='flex items-center'
        >
          <Icon icon='ph--check-circle--regular' size={4} classNames='me-1' />
          {displayMessage && (
            <span className={mx('text-sm', staticPlaceholderText)}>{t('persisted locally label')}</span>
          )}
        </Tooltip.Trigger>
      );
  }
};
