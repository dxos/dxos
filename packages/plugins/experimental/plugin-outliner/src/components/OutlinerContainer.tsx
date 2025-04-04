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

import { Outliner } from './Outliner';
import { OutlinerAction, type TreeType } from '../types';

const OutlinerContainer = ({ tree, role }: { tree: TreeType; role: string }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const space = getSpace(tree);
  if (!space || !tree) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false} role={role}>
      <Outliner.Root
        classNames={mx(attentionSurface, 'p-1.5')}
        tree={tree}
        onCreate={() => {
          return {
            id: ObjectId.random(),
            children: [],
            data: { text: '' },
          };
        }}
        onDelete={(node) => {
          space.db.remove(node);
        }}
        onAction={(event) => {
          log.info('action', { event });
          switch (event.action) {
            case 'task': {
              void dispatch(createIntent(OutlinerAction.CreateTask, { node: event.node })).then(({ data }) => {
                log.info('task created', { data });
                if (data) {
                  const task = space.db.add(data.object);
                  event.node.ref = makeRef(task);
                }
              });
              break;
            }
          }
        }}
      />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
