//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace, type Space } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { type TableModel, type ModalController } from '../../model';

type RefPanelProps = { model: TableModel; modals: ModalController };

const getRefTargetObj = (space?: Space, id?: string) => {
  if (space && id) {
    return space?.db.getObjectById(id);
  } else {
    return undefined;
  }
};

export const RefPanel = ({ model, modals }: RefPanelProps) => {
  const state = modals.state.value;
  const space = getSpace(model.table);
  const targetObj = getRefTargetObj(space, state?.type === 'refPanel' ? state.targetId : undefined);
  const schema = space && state?.type === 'refPanel' ? space.db.schemaRegistry.getSchema(state.typename) : undefined;

  if (!model.table?.view || !model.projection) {
    return null;
  }

  return (
    <Popover.Root
      modal={false}
      open={state?.type === 'refPanel' && !!targetObj && !!schema}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          return modals.close();
        }
      }}
    >
      <Popover.VirtualTrigger virtualRef={modals.trigger} />
      <Popover.Portal>
        <Popover.Content classNames='md:is-64'>
          {targetObj && schema && <Form readonly values={targetObj} schema={schema} />}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
