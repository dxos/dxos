//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { Ref.make } from '@dxos/live-object';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

import { type OutlinerRootProps } from '../components';
import { OutlinerAction } from '../types';

type UseOutlinerHandlers = Pick<OutlinerRootProps, 'onCreate' | 'onDelete' | 'onAction'>;

export const useOutlinerHandlers = (space: Space | undefined): UseOutlinerHandlers => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleCreate = useCallback<NonNullable<OutlinerRootProps['onCreate']>>(() => {
    return {
      id: ObjectId.random(),
      children: [],
      data: { text: '' },
    };
  }, []);

  const handleDelete = useCallback<NonNullable<OutlinerRootProps['onDelete']>>((node) => {
    // No-op (not an ECHO object).
  }, []);

  const handleAction = useCallback<NonNullable<OutlinerRootProps['onAction']>>(
    async (action) => {
      switch (action.action) {
        case 'task': {
          const { data } = await dispatch(createIntent(OutlinerAction.CreateTask, { node: action.node }));
          log.info('handleAction', { space: space?.id, data });
          if (space && data) {
            const task = space.db.add(data.object);
            action.node.ref = Ref.make(task);
            action.node.data.text = '';
          }
          break;
        }
      }
    },
    [dispatch, space],
  );

  return {
    onCreate: handleCreate,
    onDelete: handleDelete,
    onAction: handleAction,
  };
};
