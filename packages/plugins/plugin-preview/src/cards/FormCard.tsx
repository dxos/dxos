//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Card, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';
import { type ProjectionModel } from '@dxos/schema';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../meta';

export const FormCard = ({ subject, projection }: ObjectSurfaceProps & { projection?: ProjectionModel }) => {
  const { t } = useTranslation(meta.id);
  const echoSchema = Obj.getSchema(subject);
  const schema = useMemo(() => echoSchema && omitId(echoSchema), [echoSchema]);

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
    return <p className={mx(descriptionMessage)}>{t('unable-to-create-preview.message')}</p>;
  }

  return (
    <Card.Content>
      <Form.Root schema={schema} projection={projection} values={subject} autoSave onSave={handleSave}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.Content>
  );
};
