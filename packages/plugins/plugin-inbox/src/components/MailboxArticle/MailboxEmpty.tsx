//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { Common, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';

import { meta } from '../../meta';
import { type Mailbox } from '../../types';

export const MailboxEmpty = ({ mailbox }: { mailbox: Mailbox.Mailbox }) => {
  const db = Obj.getDatabase(mailbox);
  const tokens = useQuery(db, Filter.type(AccessToken.AccessToken));
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const openSpaceSettings = useCallback(() => {
    if (db) {
      void dispatch(
        createIntent(Common.LayoutAction.Open, {
          part: 'main',
          subject: [`integrations-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
          options: {
            workspace: db.spaceId,
          },
        }),
      );
    }
  }, [db, dispatch]);

  // TODO(ZaymonFC): This should be generalised to all tokens that can be used to source messages.
  const gmailToken = tokens.find((t) => t.source.includes('google'));
  if (!gmailToken) {
    return (
      <div className='flex flex-col items-center gap-4 p-8'>
        <p className='text-description'>{t('no integrations label')}</p>
        <Button onClick={openSpaceSettings}>{t('manage integrations button label')}</Button>
      </div>
    );
  }

  return <p className='text-description text-center p-8'>{t('empty mailbox message')}</p>;
};
