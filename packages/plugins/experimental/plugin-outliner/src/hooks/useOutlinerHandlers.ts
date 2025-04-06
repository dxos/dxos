//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { makeRef } from '@dxos/live-object';
import { type Space } from '@dxos/react-client/echo';

import { type OutlinerRootProps } from '../components';
import { OutlinerAction } from '../types';

export const useOutlinerHandlers = (space: Space | undefined) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleCreate = useCallback<NonNullable<OutlinerRootProps['onCreate']>>(() => {
    return {
      id: ObjectId.random(),
      children: [],
      data: { text: '' },
    };
  }, []);

  const handleDelete = useCallback<NonNullable<OutlinerRootProps['onDelete']>>(
    (node) => {
      space?.db.remove(node);
    },
    [space],
  );

  const handleAction = useCallback<NonNullable<OutlinerRootProps['onAction']>>(
    (action) => {
      switch (action.action) {
        case 'task': {
          void dispatch(createIntent(OutlinerAction.CreateTask, { node: action.node })).then(({ data }) => {
            if (space && data) {
              const task = space.db.add(data.object);
              action.node.ref = makeRef(task);
              action.node.data.text = '';
            }
          });
          break;
        }
      }
    },
    [dispatch, space],
  );

  return { handleCreate, handleDelete, handleAction };
};
