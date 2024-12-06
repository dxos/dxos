//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type S } from '@dxos/echo-schema';
import { getSpace } from '@dxos/react-client/echo';
import { Popover } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { type GridScopedProps, useGridContext } from '@dxos/react-ui-grid';

import { type TableModel } from '../../model';

export type CreateRefPanelProps = { model?: TableModel };

export const CreateRefPanel = ({ model, __gridScope }: GridScopedProps<CreateRefPanelProps>) => {
  const { id: gridId } = useGridContext('TableCellEditor', __gridScope);
  const space = getSpace(model?.table);
  const state = model?.modalController.state.value;
  // TODO(burdon): Remove space dependency.
  const schema = useMemo<S.Struct<any> | undefined>(() => {
    if (!space || state?.type !== 'createRefPanel') {
      return;
    }

    // TODO(thure): Can we omit `id` so it doesn’t fail validation?
    const schema: S.Struct<any> = space.db.schemaRegistry.getSchema(state.typename)?.schema as any;
    return schema.omit('id');
  }, [space, state]);

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
            <Form
              // TODO(burdon): ???
              schema={schema as any}
              values={state.initialValues ?? {}}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
