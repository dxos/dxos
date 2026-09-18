//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useLayout } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Button, Icon, Toast, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';
import { SpaceOperation } from '#types';

import { getAwaitedTarget } from '../../util/awaited-path.ts';

const WAIT_FOR_OBJECT_TIMEOUT = 3 * 60 * 1_000;
const TOAST_TIMEOUT = 4 * 60 * 1_000;

export const AwaitingObject = ({ id }: { id: string }) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [open, setOpen] = useState(true);
  const [waiting, setWaiting] = useState(true);
  const [found, setFound] = useState(false);
  const layout = useLayout();

  const client = useClient();
  // The awaited object may land in any space, so this queries the whole graph — which, unlike
  // `db.query`, does not scope itself: an unscoped query reaches the planner and throws
  // ("Query must be scoped with a from() clause"), killing whatever rendered this toast.
  const spaces = useSpaces();
  const query = useMemo(() => Query.select(Filter.everything()).from(spaces.map((space) => space.db)), [spaces]);
  const objects = useQuery(client.spaces, query);

  useEffect(() => {
    if (!id) {
      return;
    }

    const timeout = setTimeout(() => setWaiting(false), WAIT_FOR_OBJECT_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [id]);

  const target = useMemo(() => getAwaitedTarget(id), [id]);
  useEffect(() => {
    if (!target) {
      return;
    }
    const { spaceId, objectId } = target;
    const present = objectId
      ? objects.some((object) => object.id === objectId && Obj.getDatabase(object)?.spaceId === spaceId)
      : spaces.some((space) => space.id === spaceId);
    if (present) {
      setFound(true);
      if (layout.active.includes(id) || layout.workspace === id) {
        setOpen(false);
      }
    }
  }, [id, target, objects, spaces, layout]);

  const handleClose = useCallback(
    async () => invokePromise(SpaceOperation.WaitForObject, { id: undefined }),
    [invokePromise],
  );

  const handleNavigate = useCallback(() => {
    if (target?.objectId) {
      void invokePromise(LayoutOperation.Open, { subject: [id] });
    } else {
      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: id });
    }
    void handleClose();
  }, [id, target, handleClose, invokePromise]);

  // TODO(burdon): Why are we not using LayoutOperation.AddToast?
  return (
    <Toast.Root open={open} duration={TOAST_TIMEOUT} onOpenChange={setOpen}>
      <Toast.Title classNames='flex items-center gap-2'>
        {found ? (
          <>
            <Icon icon='ph--check-circle--regular' />
            <span>{t('found-object.label')}</span>
          </>
        ) : waiting ? (
          <>
            <Icon icon='ph--circle-notch--regular' classNames='animate-spin' />
            <span>{t('waiting-for-object.label')}</span>
          </>
        ) : (
          <>
            <Icon icon='ph--placeholder--regular' />
            <span>{t('object-not-found.label')}</span>
          </>
        )}
      </Toast.Title>
      <Toast.Description>
        {t(
          found
            ? 'found-object.description'
            : waiting
              ? 'waiting-for-object.description'
              : 'object-not-found.description',
        )}
      </Toast.Description>
      <Toast.Actions>
        {found ? (
          <>
            <Toast.Action altText={t('go-to-object.alt')} asChild>
              <Button variant='primary' onClick={handleNavigate}>
                {t('go-to-object.label')}
              </Button>
            </Toast.Action>
            <Toast.Close asChild>
              <Button onClick={handleClose}>{t('close.label', { ns: osTranslations })}</Button>
            </Toast.Close>
          </>
        ) : (
          <Toast.Close asChild>
            <Button onClick={handleClose}>
              {t(waiting ? 'close.label' : 'confirm.label', { ns: osTranslations })}
            </Button>
          </Toast.Close>
        )}
      </Toast.Actions>
    </Toast.Root>
  );
};
