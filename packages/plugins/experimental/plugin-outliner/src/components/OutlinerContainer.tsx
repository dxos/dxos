//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { Outliner, type OutlinerRootProps } from './Outliner';
import { OutlinerAction, type TreeType } from '../types';

const OutlinerContainer = ({ tree, role }: { tree: TreeType; role: string }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(tree);

  const handleCreate: NonNullable<OutlinerRootProps['onCreate']> = () => {
    return {
      id: ObjectId.random(),
      children: [],
      data: { text: '' },
    };
  };

  const handleDelete: NonNullable<OutlinerRootProps['onDelete']> = (node) => {
    space?.db.remove(node);
  };

  const handleAction: NonNullable<OutlinerRootProps['onAction']> = (action) => {
    switch (action.action) {
      case 'task': {
        void dispatch(createIntent(OutlinerAction.CreateTask, { node: action.node })).then(({ data }) => {
          // TODO(burdon): Show link.
          log.info('task created', { data });
          if (space && data) {
            const task = space.db.add(data.object);
            action.node.ref = makeRef(task);
            action.node.data.text = '';
          }
        });
        break;
      }
    }
  };

  if (!space || !tree) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false} role={role}>
      <Outliner.Root
        classNames={mx(attentionSurface, 'p-1.5')}
        tree={tree}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onAction={handleAction}
      />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
