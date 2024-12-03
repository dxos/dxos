//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace, type Space } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';

import { type TableModel } from '../../model';

type RefPanelProps = { model?: TableModel };

const getRefTargetObj = (space?: Space, id?: string) => {
  if (space && id) {
    return space?.db.getObjectById(id);
  } else {
    return undefined;
  }
};

export const RefPanel = ({ model }: RefPanelProps) => {
  const state = model?.modalController.state.value;
  const space = getSpace(model?.table);
  const targetObj = getRefTargetObj(space, state?.type === 'refPanel' ? state.targetId : undefined);

  if (!model?.table?.view || !model.projection) {
    return null;
  }

  return (
    <Popover.Root
      modal={false}
      open={state?.type === 'refPanel' && !!targetObj}
      onOpenChange={(nextOpen) => {
        if (model && !nextOpen) {
          return model.modalController.close();
        }
      }}
    >
      <Popover.VirtualTrigger virtualRef={model.modalController.trigger} />
      <Popover.Portal>
        <Popover.Content classNames='md:is-64'>
          {/* TODO(thure): Render a Form using the target’s schema from the space’s schema registry */}
          {/* {targetObj && <Form values={targetObj} schema={''} />} */}
          {targetObj && <p>{targetObj.id}</p>}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
