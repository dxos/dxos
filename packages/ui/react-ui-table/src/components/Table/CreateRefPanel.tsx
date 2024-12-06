//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { S } from '@dxos/echo-schema';
import { create, getSpace } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { type GridScopedProps, useGridContext } from '@dxos/react-ui-grid';

import { type TableModel } from '../../model';

export type CreateRefPanelProps = { model?: TableModel };

// TODO(burdon): Factor out Space dependency (to plugin?)
export const CreateRefPanel = ({ model, __gridScope }: GridScopedProps<CreateRefPanelProps>) => {
  const { id: gridId } = useGridContext('TableCellEditor', __gridScope);
  const space = getSpace(model?.table);
  const state = model?.modalController.state.value;
  const schema = useMemo<S.Schema<any> | undefined>(() => {
    if (!space || state?.type !== 'createRefPanel') {
      return;
    }

    const schema: S.Schema<any> | undefined = space.db.schemaRegistry.getSchema(state.typename)?.schema;
    if (schema) {
      const omit = S.omit<any, any, ['id']>('id');
      return omit(schema);
    }
  }, [space, state]);

  const handleSave = useCallback(
    (values: any) => {
      if (!space || state?.type !== 'createRefPanel') {
        return;
      }

      const schema: S.Schema<any> | undefined = space.db.schemaRegistry.getSchema(state.typename)?.schema;
      if (schema) {
        // TODO(burdon): Set property.
        const obj = space.db.add(create(schema, values));
        console.log(state);
      }

      void model?.close();
    },
    [model, space, state],
  );

  const handleCancel = useCallback(() => {
    if (model) {
      model.modalController.close();
    }
  }, [model?.modalController]);

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
        <Popover.Content classNames='md:is-64' data-grid={gridId}>
          {state?.type === 'createRefPanel' && schema && (
            <Form schema={schema} values={state.initialValues ?? {}} onSave={handleSave} onCancel={handleCancel} />
          )}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
