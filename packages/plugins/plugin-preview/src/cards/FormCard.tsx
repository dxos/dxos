//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Common } from '@dxos/app-framework';
import { type SurfaceComponentProps, useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { type ProjectionModel } from '@dxos/schema';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../meta';

export const FormCard = ({ subject, projection }: SurfaceComponentProps & { projection?: ProjectionModel }) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const schema = Obj.getSchema(subject);
  const label = Obj.getLabel(subject) ?? Obj.getTypename(subject) ?? t('unable to create preview message');

  const handleNavigate = useCallback(async () => {
    await invokePromise(Common.LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
    await invokePromise(Common.LayoutOperation.Open, { subject: [Obj.getDXN(subject).toString()] });
  }, [invokePromise, subject]);

  const handleSave = useCallback((values: any, { changed }: { changed: Record<string, boolean> }) => {
    const paths = Object.keys(changed).filter((path) => changed[path]);
    Obj.change(subject, () => {
      for (const path of paths) {
        const value = values[path];
        const parts = splitJsonPath(path as JsonPath);
        Obj.setValue(subject, parts, value);
      }
    });
  }, []);

  if (!schema) {
    // TODO(burdon): Use Alert.
    return <p className={mx(descriptionMessage)}>{t('unable to create preview message')}</p>;
  }

  return (
    <Form.Root schema={omitId(schema)} projection={projection} values={subject} autoSave onSave={handleSave}>
      {/* TODO(burdon): Scrolling issue. Need fixed height. */}
      <Form.Viewport>
        <Form.Content>
          <Form.FieldSet />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
