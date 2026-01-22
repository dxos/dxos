//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { Card } from '@dxos/react-ui-mosaic';
import { type ProjectionModel } from '@dxos/schema';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../meta';
import { type CardPreviewProps } from '../types';

export const FormCard = ({
  subject,
  projection,
  role,
}: CardPreviewProps<Obj.Any> & { projection?: ProjectionModel }) => {
  const { invokePromise } = useOperationInvoker();
  const schema = Obj.getSchema(subject);
  const { t } = useTranslation(meta.id);

  const handleNavigate = useCallback(async () => {
    await invokePromise(Common.LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
    await invokePromise(Common.LayoutOperation.Open, { subject: [Obj.getDXN(subject).toString()] });
  }, [invokePromise, subject]);

  if (!schema) {
    // TODO(burdon): Use Alert.
    return <p className={mx(descriptionMessage)}>{t('unable to create preview message')}</p>;
  }

  const handleSave = useCallback((values: any, { changed }: { changed: Record<string, boolean> }) => {
    const paths = Object.keys(changed).filter((path) => changed[path]);
    for (const path of paths) {
      const value = values[path];
      const parts = splitJsonPath(path as JsonPath);
      Obj.setValue(subject, parts, value);
    }
  }, []);

  const label = Obj.getLabel(subject) ?? Obj.getTypename(subject) ?? t('unable to create preview message');

  return (
    <Card.SurfaceRoot id={subject.id} role={role}>
      <Card.Heading classNames='flex items-center'>
        {label}
        <span className='grow' />
        <IconButton iconOnly icon='ph--arrow-right--regular' label={t('open object label')} onClick={handleNavigate} />
      </Card.Heading>
      <Form.Root
        schema={omitId(schema)}
        projection={projection}
        values={subject}
        layout={role === 'card--popover' ? 'static' : undefined}
        autoSave
        onSave={handleSave}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.SurfaceRoot>
  );
};
