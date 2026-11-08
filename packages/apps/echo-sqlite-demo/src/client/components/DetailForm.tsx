//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import { foreignKey } from '@dxos/echo-worker';
import { Form, type RefFieldDataProps, omitId } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Event, Organization, Person, getTypeIcon, types } from '../../schema.ts';

/**
 * Create a record of the chosen type, or edit the selected one.
 *
 * Both are the same schema-driven `Form`: the fields come from the ECHO type, so adding a field to `schema.ts`
 * changes this pane with no markup here. A ref field queries the database itself for the records of the type it
 * points at, which is why `employer` and `attendees` need no wiring of their own. Only `onSave` knows the
 * difference between a create and an update.
 */
export const DetailForm = ({
  db,
  typename,
  objects,
  selected,
  onDone,
  onDelete,
  classNames,
}: {
  db: SqliteDatabase;
  typename: string;
  /** Every record, which is where a ref field's candidates come from. */
  objects: readonly Obj.Unknown[];
  selected?: Obj.Unknown;
  onDone?: () => void;
  onDelete?: () => void;
  classNames?: string;
}) => {
  // The selection decides the schema, and the chosen type only decides what a new record will be: the graph shows
  // every type at once, so a node selected there is often not of the type the master is listing.
  const type = useMemo(() => {
    const name = (selected && Obj.getTypename(selected)) ?? typename;
    return types.find((type) => Type.getTypename(type) === name) ?? types[0];
  }, [selected, typename]);
  const schema = useMemo(() => omitId(type), [type]);

  /** Each candidate as an option, keyed by the URI the field matches a stored Ref against. */
  const getOptions = useCallback<NonNullable<RefFieldDataProps['getOptions']>>(
    (results) =>
      [...results]
        .sort((a, b) => (Entity.getLabel(a) ?? '').localeCompare(Entity.getLabel(b) ?? ''))
        .map((result) => {
          const uri = Entity.getURI(result);
          const refType = types.find((type) => Type.getTypename(type) === Entity.getTypename(result));
          return {
            id: uri,
            label: Entity.getLabel(result) ?? uri,
            ...(refType && { icon: getTypeIcon(refType)?.icon }),
          };
        }),
    [],
  );

  const useRefType = useCallback<NonNullable<RefFieldDataProps['useType']>>(
    (_db, typeUri) => types.find((type) => String(typeUri).includes(Type.getTypename(type))) ?? type,
    [type],
  );

  /** The selected object as form values. Refs are passed through: the field matches a `Ref` against its options. */
  const values = useMemo(
    () => (selected ? Object.fromEntries(Object.entries(selected).filter(([key]) => key !== 'id')) : {}),
    [selected],
  );

  const handleSave = useCallback(
    (next: Record<string, unknown>) => {
      // The ref fields report a `Ref` by URI; resolving it to the object is what types the Ref to its target.
      const target = (value: unknown) =>
        Ref.isRef(value) ? objects.find((obj) => Entity.getURI(obj) === value.uri) : undefined;
      const organization = (value: unknown) => {
        const obj = target(value);
        return obj && Obj.instanceOf(Organization, obj) ? obj : undefined;
      };
      const people = (value: unknown) =>
        (Array.isArray(value) ? value : [])
          .map(target)
          .filter((obj) => obj !== undefined)
          .filter((obj) => Obj.instanceOf(Person, obj));

      if (selected) {
        Obj.update(selected, (selected) => {
          for (const [key, value] of Object.entries(next)) {
            Obj.setValue(selected, [key], value);
          }
        });
      } else if (type === Person) {
        // One branch per type, because each type's props are its own; the FORM above stays generic.
        const employer = organization(next.employer);
        db.add(
          Obj.make(Person, {
            [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
            name: String(next.name ?? ''),
            email: Array.isArray(next.email) ? next.email.map((address) => String(address)) : [],
            ...(employer ? { employer: Ref.make(employer) } : {}),
          }),
        );
      } else if (type === Event) {
        db.add(
          Obj.make(Event, {
            [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
            title: String(next.title ?? ''),
            ...(next.description ? { description: String(next.description) } : {}),
            attendees: people(next.attendees).map((person) => Ref.make(person)),
          }),
        );
      } else {
        db.add(
          Obj.make(Organization, {
            [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
            name: String(next.name ?? ''),
            ...(next.website ? { website: String(next.website) } : {}),
          }),
        );
      }
      onDone?.();
    },
    [db, objects, selected, type, onDone],
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
                key={selected?.id ?? Type.getTypename(type)}
                schema={schema}
                values={values}
                db={db}
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
