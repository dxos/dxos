//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React, { useCallback, useMemo } from 'react';

import { live } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { type GridScopedProps, useGridContext } from '@dxos/react-ui-grid';

import { type TableModel, type ModalController } from '../../model';

export type CreateRefPanelProps = { model?: TableModel; modals: ModalController };

// TODO(burdon): Factor out Space dependency (to plugin?)
export const CreateRefPanel = ({ model, modals, __gridScope }: GridScopedProps<CreateRefPanelProps>) => {
  const { id: gridId } = useGridContext('TableCellEditor', __gridScope);
  const space = model?.space;
  const state = modals.state.value;

  const schema = useMemo<Schema.Schema<any> | undefined>(() => {
    if (!space || state?.type !== 'createRefPanel') {
      return;
    }

    const [schema] = space.db.schemaRegistry.query({ typename: state.typename }).runSync();
    if (schema) {
      const omit = Schema.omit<any, any, ['id']>('id');
      return omit(schema);
    }
  }, [space, state]);

  const handleSave = useCallback(
    (values: any) => {
      if (!model || !space || state?.type !== 'createRefPanel') {
        return;
      }

      const [schema] = space.db.schemaRegistry.query({ typename: state.typename }).runSync();
      if (schema) {
        const obj = space.db.add(live(schema, values));
        state.onCreate?.(obj);
      }
      void modals.close();
    },
    [modals, space, state],
  );

  const handleCancel = useCallback(() => {
    if (model) {
      modals.close();
    }
  }, [modals]);

  if (!model?.projectionManager || !model.projection) {
    return null;
  }

  return (
    <Popover.Root
      modal={false}
      open={state?.type === 'createRefPanel' && !!schema}
      onOpenChange={(nextOpen) => {
        if (model && !nextOpen) {
          return modals.close();
        }
      }}
    >
      <Popover.VirtualTrigger virtualRef={modals.trigger} />
      <Popover.Portal>
        <Popover.Content classNames='md:is-64' data-grid={gridId}>
          <Popover.Viewport>
            {state?.type === 'createRefPanel' && schema && (
              <Form schema={schema} values={state.initialValues ?? {}} onSave={handleSave} onCancel={handleCancel} />
            )}
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
