//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { useTranslation, Button } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';

import { INBOX_PLUGIN } from '../../meta';
import { type MailboxType } from '../../types';

export const EmptyMailboxContent = ({ mailbox }: { mailbox: MailboxType }) => {
  const space = getSpace(mailbox);
  const tokens = useQuery(space, Filter.schema(DataType.AccessToken));
  const { t } = useTranslation(INBOX_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const openSpaceSettings = useCallback(() => {
    if (space) {
      void dispatch(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [`integrations-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`],
          options: {
            workspace: space.id,
          },
        }),
      );
    }
  }, [space, dispatch]);

  // TODO(ZaymonFC): This should be generalised to all tokens that can be used to source messages.
  const gmailToken = tokens.find((t) => t.source.includes('gmail'));
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
