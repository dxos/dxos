//
// Copyright 2025 DXOS.org
//

import React from 'react';
import { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
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
      const parts = splitJsonPath(path as JsonPath);
      Obj.setValue(subject, parts, value);
    }
  }, []);

  return (
    <Card.SurfaceRoot id={subject.id} role={role}>
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
