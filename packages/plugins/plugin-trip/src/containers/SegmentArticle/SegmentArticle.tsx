//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/effect';
import { Panel } from '@dxos/react-ui';
import { Form, omitId } from '@dxos/react-ui-form';

import { Segment, Trip } from '#types';

/**
 * Companion surface for a selected Segment.
 *
 * Renders a single `Form` driven directly by the Segment's ECHO schema —
 * autosave writes each changed field straight back onto the reactive
 * object via `Obj.setValue`. No per-kind projection / form mapping.
 */
export type SegmentArticleProps = AppSurface.ArticleProps<Segment.Segment, {}, Trip.Trip>;

export const SegmentArticle = ({ role, subject: segment }: SegmentArticleProps) => {
  const echoSchema = Obj.getSchema(segment);
  const schema = useMemo(() => echoSchema && omitId(echoSchema), [echoSchema]);

  const handleSave = useCallback(
    (values: Record<string, unknown>, { changed }: { changed: Record<string, boolean> }) => {
      const paths = Object.keys(changed).filter((path) => changed[path]);
      Obj.update(segment, () => {
        for (const path of paths) {
          Obj.setValue(segment, splitJsonPath(path as JsonPath), values[path]);
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
      <Panel.Content asChild>
        <Form.Root key={segment.id} schema={schema} values={segment} autoSave onSave={handleSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
