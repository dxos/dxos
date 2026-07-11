//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { Panel, ScrollArea } from '@dxos/react-ui';
import { Form, type FormUpdateMeta, omitId } from '@dxos/react-ui-form';

import { Book } from '#types';

export type BookArticleProps = AppSurface.ObjectArticleProps<Book.Book>;

/**
 * Full-page editable view of a single book, driven by the `Book` schema.
 */
export const BookArticle = ({ subject, role }: BookArticleProps) => {
  const schema = useMemo(() => omitId(Type.getSchema(Book.Book)), []);

  const handleSave = useCallback(
    (values: AnyProperties, { changed }: FormUpdateMeta<AnyProperties>) => {
      // `Object.keys` widens the branded JsonPath keys to `string`; re-narrow to iterate them.
      const paths = (Object.keys(changed) as SchemaEx.JsonPath[]).filter((path) => changed[path]);
      Obj.update(subject, () => {
        for (const path of paths) {
          Obj.setValue(subject, SchemaEx.splitJsonPath(path), SchemaEx.getValue(values, path));
        }
      });
    },
    [subject],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Form.Root schema={schema} values={subject} autoSave onSave={handleSave}>
              <Form.Viewport>
                <Form.Content>
                  <Form.FieldSet />
                </Form.Content>
              </Form.Viewport>
            </Form.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
