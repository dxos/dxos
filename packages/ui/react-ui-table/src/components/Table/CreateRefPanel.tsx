//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { type GridScopedProps, useGridContext } from '@dxos/react-ui-grid';

import { type TableModel } from '../../model';

type CreateRefPanelProps = { model?: TableModel };

export const CreateRefPanel = ({ model, __gridScope }: GridScopedProps<CreateRefPanelProps>) => {
  const { id: gridId } = useGridContext('TableCellEditor', __gridScope);
  const state = model?.modalController.state.value;
  const space = getSpace(model?.table);
  const schema =
    space && state?.type === 'createRefPanel' ? space.db.schemaRegistry.getSchema(state.typename) : undefined;

  // TODO(thure): Can we omit `id` so it doesn’t fail validation?
  // const editSchema = useMemo(() => {
  //   if (schema) {
  //     return (schema.schema as unknown as S.Struct<any>).omit('id') as unknown as S.Schema<any>;
  //   } else {
  //     return undefined;
  //   }
  // }, [schema]);

  if (!model?.table?.view || !model.projection) {
    return null;
  }

  const handleSave = useCallback(
    (values: any) => {
      // TODO(thure): Implement (perhaps based on AutomationPanel)
      console.log('[save]', values);
    },
    [schema],
  );

  const handleCancel = useCallback(() => {
    if (model) {
      model.modalController.close();
    }
  }, [model?.modalController]);

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
            <Form onSave={handleSave} onCancel={handleCancel} values={state.initialValues ?? {}} schema={schema} />
          )}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
