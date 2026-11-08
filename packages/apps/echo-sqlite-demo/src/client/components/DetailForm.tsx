//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import { foreignKey } from '@dxos/echo-worker';
import { Form, type RefOption, omitId } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Organization, Person, types } from '../../schema.ts';

/**
 * Create a record of the chosen type, or edit the selected one.
 *
 * Both are the same schema-driven `Form`: the fields come from the ECHO type, so adding a field to `schema.ts`
 * changes this pane with no markup here. Only `onSave` knows the difference between a create and an update.
 */
export const DetailForm = ({
  db,
  typename,
  organizations,
  selected,
  onDone,
  onDelete,
  classNames,
}: {
  db: SqliteDatabase;
  typename: string;
  organizations: readonly Organization[];
  selected?: Obj.Unknown;
  onDone?: () => void;
  onDelete?: () => void;
  classNames?: string;
}) => {
  const type = useMemo(() => types.find((type) => Type.getTypename(type) === typename) ?? Organization, [typename]);
  const schema = useMemo(() => omitId(type), [type]);

  /** Candidates for the `employer` ref, keyed by the entity URI the field matches a stored Ref against. */
  const getOptions = useCallback(
    (): RefOption[] => organizations.map((org) => ({ id: Entity.getURI(org), label: org.name })),
    [organizations],
  );

  const useRefType = useCallback(() => Organization, []);

  /** The selected object as form values. Refs are passed through: the field matches a `Ref` against its options. */
  const values = useMemo(
    () => (selected ? Object.fromEntries(Object.entries(selected).filter(([key]) => key !== 'id')) : {}),
    [selected],
  );

  const handleSave = useCallback(
    (next: Record<string, unknown>) => {
      // The ref field reports a `Ref` by URI; resolving it to the object is what types the Ref to Organization.
      const ref = Ref.isRef(next.employer) ? next.employer : undefined;
      const employer = ref && organizations.find((org) => Entity.getURI(org) === ref.uri);

      if (selected) {
        Obj.update(selected, (draft) => {
          for (const [key, value] of Object.entries(next)) {
            Obj.setValue(draft, [key], value);
          }
        });
      } else if (type === Person) {
        // One branch per type, because each type's props are its own; the FORM above stays generic.
        db.add(
          Obj.make(Person, {
            [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
            name: String(next.name ?? ''),
            emails: Array.isArray(next.emails) ? next.emails.map((email) => String(email)) : [],
            ...(employer ? { employer: Ref.make(employer) } : {}),
          }),
        );
      } else {
        db.add(
          Obj.make(Organization, {
            [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
            name: String(next.name ?? ''),
          }),
        );
      }
      onDone?.();
    },
    [db, organizations, selected, type, onDone],
  );

  return (
    // A nested Panel, so the form's own Container inherits the panel's gutter rather than a wrapper div's nothing.
    <Panel.Root classNames={classNames}>
      <Panel.Header asChild>
        <Toolbar.Root>
          {selected && onDelete && (
            <Button.Root
              classNames='ms-auto'
              icon='ph--trash--regular'
              label='Delete'
              iconOnly
              variant='ghost'
              onClick={onDelete}
            />
          )}
        </Toolbar.Root>
      </Panel.Header>

      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container gutter='md'>
              <Form.Root
                // Remounting drops the previous subject's values rather than carrying them over.
                key={selected?.id ?? typename}
                schema={schema}
                values={values}
                getOptions={getOptions}
                useType={useRefType}
                onSave={handleSave}
              >
                <Form.Content>
                  <Form.Fields exclude={['id']} />
                  <Form.Actions />
                </Form.Content>
              </Form.Root>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
