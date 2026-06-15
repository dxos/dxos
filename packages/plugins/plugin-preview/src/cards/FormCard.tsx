//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { useType } from '@dxos/echo-react';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { Card, Icon, useTranslation } from '@dxos/react-ui';
import { Form, type FormUpdateMeta, type FormPresentation, getFormProperties, omitId } from '@dxos/react-ui-form';
import { type ProjectionModel } from '@dxos/schema';

import { meta } from '#meta';

export type FormCardProps = AppSurface.ObjectCardProps & {
  projection?: ProjectionModel;
  readonly?: boolean;
  layout?: FormPresentation;
};

/**
 * Default/fallback card for any ECHO object.
 * Renders a `Form` against the object's schema — either the static schema
 * from `Obj.getSchema` or, for runtime/mutable schemas, the reactive
 * schema looked up via `useType`.
 */
export const FormCard = ({ subject, projection, readonly = true, layout }: FormCardProps) => {
  const { t } = useTranslation(meta.id);
  // Readonly cards default to the `static` presentation — plain DOM, undefined values
  // omitted — which reads as a preview rather than a form. Editable cards keep the
  // `compact` form layout. Callers can override either via the explicit `layout` prop.
  const resolvedLayout: FormPresentation = layout ?? (readonly ? 'static' : 'compact');

  // Try the static schema first; fall back to the runtime/database schema for
  // dynamic types whose schema isn't reachable via `Obj.getSchema` (DXN mismatch).
  const staticType = Obj.getType(subject);
  const db = Obj.getDatabase(subject);
  // `Obj.getTypeURI` throws on corrupted objects that are missing a type; swallow that
  // and fall through to the "unable to create preview" path rather than crashing the card.
  const fallbackTypeUri = useMemo(() => {
    if (staticType) {
      return undefined;
    }
    try {
      return Obj.getTypeURI(subject);
    } catch {
      return undefined;
    }
  }, [staticType, subject]);
  const runtimeType = useType(db, fallbackTypeUri);
  const schema = useMemo((): Schema.Schema.AnyNoContext | undefined => {
    const resolvedType = runtimeType ?? staticType;
    return resolvedType ? omitId(Type.getSchema(resolvedType)) : undefined;
  }, [runtimeType, staticType]);

  // Predict whether the form would render anything visible. Without this guard,
  // readonly + compact mode produces an empty scrollarea when every form-renderable
  // field is unset (e.g., a Table object whose `view`/`sizes` are FormInput-hidden
  // and whose `name` is undefined).
  //
  // - In editable mode (`!readonly`), the form renders empty fields, so we only
  //   bail when there are no form-renderable properties at all.
  // - In readonly mode, the form hides fields with null/undefined values, so we
  //   bail when no form-renderable property has a non-null value.
  const hasRenderableContent = useMemo(() => {
    if (!schema) {
      return false;
    }
    const properties = getFormProperties(schema.ast);
    if (properties.length === 0) {
      return false;
    }
    if (!readonly) {
      return true;
    }
    return properties.some((prop) => (subject as any)?.[prop.name] != null);
  }, [schema, subject, readonly]);

  const handleSave = useCallback(
    (values: AnyProperties, { changed }: FormUpdateMeta<AnyProperties>) => {
      const paths = (Object.keys(changed) as SchemaEx.JsonPath[]).filter((path) => changed[path]);
      Obj.update(subject, () => {
        for (const path of paths) {
          const parts = SchemaEx.splitJsonPath(path);
          const value = Obj.getValue(values as any, parts);
          Obj.setValue(subject, parts, value);
        }
      });
    },
    [subject],
  );

  if (!schema || !hasRenderableContent) {
    return (
      <Card.Body>
        <Card.Row>
          <Card.Text variant='description'>{t('unable-to-create-preview.message')}</Card.Text>
        </Card.Row>
      </Card.Body>
    );
  }

  const { icon, hue } = Obj.getIcon(subject) ?? { icon: 'ph--circle-dashed--regular', hue: 'neutral' };

  return (
    <Card.Body>
      <Form.Root
        schema={schema}
        projection={projection}
        values={subject}
        readonly={readonly}
        layout={resolvedLayout}
        autoSave
        onSave={handleSave}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
      <Card.Row fullWidth>
        <div className='pt-1'>
          <div {...{ 'data-hue': hue }} className='inline-flex items-center gap-1 dx-tag'>
            <Icon icon={icon} />
            <span>{Obj.getTypename(subject)}</span>
          </div>
        </div>
      </Card.Row>
    </Card.Body>
  );
};
