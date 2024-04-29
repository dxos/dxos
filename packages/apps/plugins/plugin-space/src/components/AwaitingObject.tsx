//
// Copyright 2023 DXOS.org
//

import { CheckCircle, CircleDashed, CircleNotch } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { parseIntentPlugin, useResolvePlugin, parseNavigationPlugin, NavigationAction } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Toast, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction } from '../types';

const WAIT_FOR_OBJECT_TIMEOUT = 180e3; // 3 minutes
const TOAST_TIMEOUT = 240e3; // 4 minutes

export const AwaitingObject = ({ id }: { id: string }) => {
  const [open, setOpen] = useState(true);
  const [waiting, setWaiting] = useState(true);
  const [found, setFound] = useState(false);
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);
  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);

  const client = useClient();
  const objects = useQuery(client.spaces);

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
    if (objects.findIndex((object) => object.id === id) > -1) {
      setFound(true);

      if (navigationPlugin?.provides.location.active === id) {
        setOpen(false);
      }
    }
  }, [id, objects, intentPlugin]);

  const handleClose = async () =>
    intentPlugin?.provides.intent.dispatch({
      plugin: SPACE_PLUGIN,
      action: SpaceAction.WAIT_FOR_OBJECT,
      data: { id: undefined },
    });

  const handleNavigate = () => {
    void intentPlugin?.provides.intent.dispatch({
      action: NavigationAction.ACTIVATE,
      data: { id },
    });
    void handleClose();
  };

  return (
    <Toast.Root open={open} duration={TOAST_TIMEOUT} onOpenChange={setOpen}>
      <Toast.Body>
        <Toast.Title classNames='flex items-center gap-2'>
          {found ? (
            <>
              <CheckCircle className={getSize(5)} />
              <span>{t('found object label')}</span>
            </>
          ) : waiting ? (
            <>
              <CircleNotch className={mx(getSize(5), 'animate-spin')} />
              <span>{t('waiting for object label')}</span>
            </>
          ) : (
            <>
              <CircleDashed className={getSize(5)} />
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
