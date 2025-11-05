//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';

import { meta } from '../../meta';
import { type Mailbox } from '../../types';

export const MailboxEmpty = ({ mailbox }: { mailbox: Mailbox.Mailbox }) => {
  const space = getSpace(mailbox);
  const tokens = useQuery(space, Filter.type(DataType.AccessToken.AccessToken));
  const { t } = useTranslation(meta.id);
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
