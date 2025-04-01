//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { Outliner } from './Outliner';
import { OutlinerAction, type OutlineType, TreeNodeType } from '../types';

const OutlinerContainer = ({ outline, role }: { outline: OutlineType; role: string }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const space = getSpace(outline);
  if (!space || !outline.tree.target) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <Outliner.Root
        classNames={mx(attentionSurface, 'p-1.5')}
        tree={outline.tree.target}
        onCreate={() => {
          return space.db.add(create(TreeNodeType, { data: { text: '' }, children: [] }));
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
