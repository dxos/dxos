//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { type TableModel } from '../../model';

type CreateRefPanelProps = { model?: TableModel };

export const CreateRefPanel = ({ model }: CreateRefPanelProps) => {
  const state = model?.modalController.state.value;
  const space = getSpace(model?.table);
  const schema =
    space && state?.type === 'createRefPanel' ? space.db.schemaRegistry.getSchema(state.typename) : undefined;

  if (!model?.table?.view || !model.projection) {
    return null;
  }

  return (
    <Popover.Root
      modal={false}
      open={state?.type === 'createRefPanel' && !!schema}
      onOpenChange={(nextOpen) => {
        if (model && !nextOpen) {
          return model.modalController.close();
        }
      }}
    >
      <Popover.VirtualTrigger virtualRef={model.modalController.trigger} />
      <Popover.Portal>
        <Popover.Content classNames='md:is-64'>
          {schema && <Form values={{} /* todo(thure): Implement? Or is it really optional? */} schema={schema} />}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
