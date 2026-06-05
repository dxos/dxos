//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

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
  const { t } = useTranslation(meta.id);
  const type = Obj.getType(segment);
  const echoSchema = type && Type.getSchema(type);
  const schema = useMemo(() => echoSchema && omitId(echoSchema), [echoSchema]);
  const [viewMode, setViewMode] = useState<ViewMode>('form');

  const handleSave = useCallback(
    (values: Record<string, unknown>, { changed }: { changed: Record<string, boolean> }) => {
      const paths = Object.keys(changed).filter((path) => changed[path]);
      Obj.update(segment, () => {
        for (const path of paths) {
          const parts = splitJsonPath(path as JsonPath);
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
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <div className='grow' />
          <Toolbar.ToggleGroup
            type='single'
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
          >
            <Toolbar.ToggleGroupIconItem
              value='form'
              icon='ph--list-bullets--regular'
              iconOnly
              label={t('segment.view.form.label')}
            />
            <Toolbar.ToggleGroupIconItem
              value='search'
              icon='ph--magnifying-glass--regular'
              iconOnly
              label={t('segment.view.search.label')}
            />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {viewMode === 'search' ? (
          // Key by segment id so switching/adding a segment resets the search form state.
          <BookingSearch key={segment.id} segment={segment} />
        ) : (
          <Form.Root key={segment.id} schema={schema} defaultValues={segment} autoSave onSave={handleSave}>
            <Form.Viewport scroll>
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
