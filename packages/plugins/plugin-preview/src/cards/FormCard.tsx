//
// Copyright 2025 DXOS.org
//

import React from 'react';
import { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { type JsonPath, setValue } from '@dxos/echo/internal';
import { useTranslation } from '@dxos/react-ui';
import { NewForm } from '@dxos/react-ui-form';
import { Card } from '@dxos/react-ui-stack';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';
import { type ProjectionModel } from '@dxos/schema';

import { meta } from '../meta';
import { type CardPreviewProps } from '../types';

export const FormCard = ({
  subject,
  projection,
  role,
}: CardPreviewProps<Obj.Any> & { projection?: ProjectionModel }) => {
  const schema = Obj.getSchema(subject);
  const { t } = useTranslation(meta.id);
  if (!schema) {
    // TODO(burdon): Use Alert.
    return <p className={mx(descriptionMessage)}>{t('unable to create preview message')}</p>;
  }

  const handleSave = useCallback((values: any, { changed }: { changed: Record<string, boolean> }) => {
    const paths = Object.keys(changed).filter((path) => changed[path]);
    for (const path of paths) {
      const value = values[path];
      setValue(subject, path as JsonPath, value);
    }
  }, []);

  return (
    <Card.SurfaceRoot id={subject.id} role={role}>
      <NewForm.Root
        schema={schema}
        projection={projection}
        values={subject}
        layout={role === 'card--popover' ? 'static' : undefined}
        autoSave
        onSave={handleSave}
      >
        <NewForm.Viewport>
          <NewForm.Content>
            <NewForm.FieldSet />
          </NewForm.Content>
        </NewForm.Viewport>
      </NewForm.Root>
    </Card.SurfaceRoot>
  );
};
