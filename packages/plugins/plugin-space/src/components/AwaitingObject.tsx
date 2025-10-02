//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher, useLayout } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { Filter, fullyQualifiedId, useQuery } from '@dxos/react-client/echo';
import { Button, Icon, Toast, useTranslation } from '@dxos/react-ui';

import { meta } from '../meta';
import { SpaceAction } from '../types';

const WAIT_FOR_OBJECT_TIMEOUT = 180e3; // 3 minutes
const TOAST_TIMEOUT = 240e3; // 4 minutes

export const AwaitingObject = ({ id }: { id: string }) => {
  const [open, setOpen] = useState(true);
  const [waiting, setWaiting] = useState(true);
  const [found, setFound] = useState(false);
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const layout = useLayout();

  const client = useClient();
  const objects = useQuery(client.spaces, Filter.everything());

  useEffect(() => {
    if (!id) {
      return;
    }

    const timeout = setTimeout(() => {
      setWaiting(false);
    }, WAIT_FOR_OBJECT_TIMEOUT);

    () => clearTimeout(timeout);
  }, [id]);

  useEffect(() => {
    if (objects.findIndex((object) => fullyQualifiedId(object) === id) > -1) {
      setFound(true);

      if (layout.active.includes(id)) {
        setOpen(false);
      }
    }
  }, [id, objects, layout]);

  const handleClose = useCallback(
    async () => dispatch(createIntent(SpaceAction.WaitForObject, { id: undefined })),
    [dispatch],
  );

  const handleNavigate = useCallback(() => {
    void dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [id] }));
    void handleClose();
  }, [id, handleClose, dispatch]);

  return (
    <Toast.Root open={open} duration={TOAST_TIMEOUT} onOpenChange={setOpen}>
      <Toast.Body>
        <Toast.Title classNames='flex items-center gap-2'>
          {found ? (
            <>
              <Icon icon='ph--check-circle--regular' size={5} />
              <span>{t('found object label')}</span>
            </>
          ) : waiting ? (
            <>
              <Icon icon='ph--circle-notch--regular' size={5} classNames='animate-spin' />
              <span>{t('waiting for object label')}</span>
            </>
          ) : (
            <>
              <Icon icon='ph--circle-dashed--regular' size={5} />
              <span>{t('object not found label')}</span>
            </>
          )}
        </Toast.Title>
        <Toast.Description>
          {t(
            found
              ? 'found object description'
              : waiting
                ? 'waiting for object description'
                : 'object not found description',
          )}
        </Toast.Description>
      </Toast.Body>
      <Toast.Actions>
        {found ? (
          <>
            <Toast.Action altText={t('go to object alt')} asChild>
              <Button variant='primary' onClick={handleNavigate}>
                {t('go to object label')}
              </Button>
            </Toast.Action>
            <Toast.Close asChild>
              <Button onClick={handleClose}>{t('close label', { ns: 'appkit' })}</Button>
            </Toast.Close>
          </>
        ) : (
          <Toast.Close asChild>
            <Button onClick={handleClose}>{t(waiting ? 'close label' : 'confirm label', { ns: 'appkit' })}</Button>
          </Toast.Close>
        )}
      </Toast.Actions>
    </Toast.Root>
  );
};
