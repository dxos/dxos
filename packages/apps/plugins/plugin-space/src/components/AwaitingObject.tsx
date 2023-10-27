//
// Copyright 2023 DXOS.org
//

import { CheckCircle, SpinnerGap, Warning } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { LayoutAction, parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { Button, Toast, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN, SpaceAction } from '../types';

const WAIT_FOR_OBJECT_TIMEOUT = 180e3; // 3 minutes
const TOAST_TIMEOUT = 240e3; // 4 minutes

export const AwaitingObject = ({ id }: { id: string }) => {
  const [waiting, setWaiting] = useState(true);
  const [found, setFound] = useState(false);
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  const client = useClient();
  const query = useMemo(() => client.spaces.query(), []);
  const objects = useSyncExternalStore(
    (cb) => query.subscribe(cb),
    () => query.objects,
  );

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
      action: LayoutAction.ACTIVATE,
      data: { id },
    });
    void handleClose();
  };

  return (
    <Toast.Root defaultOpen duration={TOAST_TIMEOUT}>
      <Toast.Body>
        <Toast.Title>
          {found ? (
            <>
              <CheckCircle className={mx(getSize(5), 'inline mr-1')} />
              <span>{t('found object label')}</span>
            </>
          ) : waiting ? (
            <>
              <SpinnerGap className={mx(getSize(5), 'animate-spinning inline mr-1')} />
              <span>{t('waiting for object label')}</span>
            </>
          ) : (
            <>
              <Warning className={mx(getSize(5), 'inline mr-1')} />
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
        {found && (
          <Toast.Action altText={t('go to object alt')} asChild>
            <Button variant='primary' onClick={handleNavigate}>
              {t('go to object label')}
            </Button>
          </Toast.Action>
        )}
        {(!waiting || found) && (
          <Toast.Close asChild>
            <Button onClick={handleClose}>{t('close label', { ns: 'appkit' })}</Button>
          </Toast.Close>
        )}
      </Toast.Actions>
    </Toast.Root>
  );
};
