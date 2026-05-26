//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useSchema } from '@dxos/echo-react';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Card, useTranslation } from '@dxos/react-ui';
import { Form, type FormUpdateMeta, type Presentation, omitId } from '@dxos/react-ui-form';
import { type ProjectionModel } from '@dxos/schema';

import { meta } from '#meta';

export type FormCardProps = AppSurface.ObjectCardProps & {
  projection?: ProjectionModel;
  readonly?: boolean;
  layout?: Presentation;
};

/**
 * Default/fallback card for any ECHO object.
 * Renders a `Form` against the object's schema — either the static schema
 * from `Obj.getSchema` or, for runtime/mutable schemas, the reactive
 * schema looked up via `useSchema`.
 */
export const FormCard = ({ subject, projection, readonly = true, layout = 'compact' }: FormCardProps) => {
  const { t } = useTranslation(meta.id);

  // Try the static schema first; fall back to the runtime/database schema for
  // dynamic types whose schema isn't reachable via `Obj.getSchema` (DXN mismatch).
  const staticSchema = Obj.getSchema(subject);
  const db = Obj.getDatabase(subject);
  const typename = Obj.getTypename(subject);
  const runtimeSchema = useSchema(db, staticSchema ? undefined : typename);
  const schema = useMemo(() => {
    const resolved = runtimeSchema ?? staticSchema;
    return resolved && omitId(resolved);
  }, [runtimeSchema, staticSchema]);

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
    return (
      <Card.Content>
        <Card.Row>
          <Card.Text variant='description'>{t('unable-to-create-preview.message')}</Card.Text>
        </Card.Row>
      </Card.Content>
    );
  }

  return (
    <Card.Content>
      <Form.Root
        schema={schema}
        projection={projection}
        values={subject}
        readonly={readonly}
        layout={layout}
        autoSave
        onSave={handleSave}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Card.Content>
  );
};
