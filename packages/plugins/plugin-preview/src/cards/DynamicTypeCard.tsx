//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useSchema } from '@dxos/echo-react';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Card, useTranslation } from '@dxos/react-ui';
import { Form, type FormUpdateMeta, omitId } from '@dxos/react-ui-form';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export const DynamicTypeCard = ({ subject }: AppSurface.ObjectCardProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(subject);
  const typename = Obj.getTypename(subject);
  const runtimeSchema = useSchema(db, typename);
  const schema = useMemo(() => runtimeSchema && omitId(Type.getSchema(runtimeSchema)), [runtimeSchema]);

  const handleSave = useCallback(
    (values: Record<string, unknown>, { changed }: FormUpdateMeta<Record<string, unknown>>) => {
      const paths = (Object.keys(changed) as JsonPath[]).filter((path) => changed[path]);
      Obj.update(subject, () => {
        for (const path of paths) {
          const parts = splitJsonPath(path);
          const value = Obj.getValue(values as any, parts);
          Obj.setValue(subject, parts, value);
        }
      });
    },
    [subject],
  );

  if (!schema) {
    return <p className={mx(descriptionMessage)}>{t('unable-to-create-preview.message')}</p>;
  }

  return (
    <Card.Content>
      <Form.Root schema={schema} values={subject} autoSave onSave={handleSave}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.Content>
  );
};
