//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { omitId, Form } from '@dxos/react-ui-form';
import { Next } from '@dxos/react-ui/next';

import { BookingSearch } from '#containers';
import { meta } from '#meta';
import { Segment, Trip } from '#types';

type ViewMode = 'form' | 'search';

/**
 * Companion surface for a selected Segment. A toolbar toggles between the
 * schema-driven edit Form and the BookingSearch surface. Defaults to the Form
 * view; the user can switch either way — the toolbar drives the view, it is not
 * a hard conditional.
 */
export type SegmentArticleProps = AppSurface.ArticleProps<Segment.Segment, {}, Trip.Trip>;

export const SegmentArticle = ({ role, subject: segment }: SegmentArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const type = Obj.getType(segment);
  const echoSchema = type && Type.getSchema(type);
  const schema = useMemo(() => echoSchema && omitId(echoSchema), [echoSchema]);
  const [viewMode, setViewMode] = useState<ViewMode>('form');

  const handleSave = useCallback(
    (values: Record<string, unknown>, { changed }: { changed: Record<string, boolean> }) => {
      const paths = Object.keys(changed).filter((path) => changed[path]);
      Obj.update(segment, (segment) => {
        for (const path of paths) {
          const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);
          const value = Obj.getValue(values as any, parts);
          Obj.setValue(segment, parts, value);
        }
      });
    },
    [segment],
  );

  if (!schema) {
    return null;
  }

  return (
    <Next.Panel.Root role={role} width='document'>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <div className='grow' />
          <Next.Toolbar.ToggleGroup
            type='single'
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
          >
            <Next.ToggleGroup.Item
              value='form'
              icon='ph--list-bullets--regular'
              iconOnly
              label={t('segment.view.form.label')}
            />
            <Next.ToggleGroup.Item
              value='search'
              icon='ph--magnifying-glass--regular'
              iconOnly
              label={t('segment.view.search.label')}
            />
          </Next.Toolbar.ToggleGroup>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        {viewMode === 'search' ? (
          // Key by segment id so switching/adding a segment resets the search form state.
          <BookingSearch key={segment.id} segment={segment} />
        ) : (
          <Form.Root key={segment.id} schema={schema} defaultValues={segment} autoSave onSave={handleSave}>
            <Form.Viewport scroll>
              <Form.Content>
                <Form.Fields />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        )}
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

SegmentArticle.displayName = 'SegmentArticle';
