//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Database, Entity, Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Form, type RefFieldDataProps, omitId } from '@dxos/react-ui-form';

import { addEvent, addOrganization, addPerson, updateRecord } from '../records.ts';
import { Event, Organization, Person, getTypeIcon, types } from '../schema.ts';

// #region title
/** The record's name, re-rendered whenever any peer renames it. */
const RecordTitle = ({ record }: { record: Obj.Unknown }) => {
  const [snapshot] = useObject(record);
  const label = 'title' in snapshot ? snapshot.title : 'name' in snapshot ? snapshot.name : undefined;
  return <h3 className='text-lg font-medium'>{String(label ?? '')}</h3>;
};
// #endregion

/** Text out of a form value, or nothing for a blank field. */
const optional = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : undefined);

/**
 * Creates a record of `type`, or edits `record`. The fields come from the type's schema, and a reference field
 * offers the records of the type it points at.
 */
export const RecordForm = ({
  db,
  type,
  record,
  records,
  readonly,
  onDone,
}: {
  db: Database.Database;
  type: Type.AnyObj;
  record?: Obj.Unknown;
  /** Every record, which a reference field's choice is resolved against. */
  records: readonly Obj.Unknown[];
  readonly?: boolean;
  onDone?: () => void;
}) => {
  const recordType = useMemo(
    () => (record && types.find((type) => Type.getTypename(type) === Obj.getTypename(record))) ?? type,
    [record, type],
  );
  const schema = useMemo(() => omitId(recordType), [recordType]);
  const values = useMemo(
    () => (record ? Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'id')) : {}),
    [record],
  );

  // #region refs
  /** The options a reference field offers: the records of its target type, by label. */
  const getOptions = useCallback<NonNullable<RefFieldDataProps['getOptions']>>(
    (results) =>
      [...results]
        .sort((a, b) => (Entity.getLabel(a) ?? '').localeCompare(Entity.getLabel(b) ?? ''))
        .map((result) => {
          const target = types.find((type) => Type.getTypename(type) === Entity.getTypename(result));
          return {
            id: Entity.getURI(result),
            label: Entity.getLabel(result) ?? result.id,
            ...(target && { icon: getTypeIcon(target)?.icon }),
          };
        }),
    [],
  );

  const useRefType = useCallback<NonNullable<RefFieldDataProps['useType']>>(
    (_db, typeUri) => types.find((type) => String(typeUri).includes(Type.getTypename(type))) ?? recordType,
    [recordType],
  );
  // #endregion

  // #region save
  const handleSave = useCallback(
    (next: Record<string, unknown>) => {
      if (record) {
        updateRecord(record, next);
        onDone?.();
        return;
      }

      // A reference field reports the URI of its choice; the record behind it is what the add functions take.
      const resolve = (value: unknown) =>
        Ref.isRef(value) ? records.find((candidate) => Entity.getURI(candidate) === value.uri) : undefined;
      if (recordType === Person) {
        const employer = resolve(next.employer);
        addPerson(db, {
          name: String(next.name ?? ''),
          email: optional(next.email),
          employer: employer && Obj.instanceOf(Organization, employer) ? employer : undefined,
        });
      } else if (recordType === Event) {
        addEvent(db, {
          title: String(next.title ?? ''),
          description: optional(next.description),
          attendees: (Array.isArray(next.attendees) ? next.attendees : [])
            .map(resolve)
            .filter((candidate) => candidate !== undefined)
            .filter((candidate) => Obj.instanceOf(Person, candidate)),
        });
      } else {
        addOrganization(db, { name: String(next.name ?? ''), website: optional(next.website) });
      }
      onDone?.();
    },
    [db, record, records, recordType, onDone],
  );
  // #endregion

  return (
    <div className='flex flex-col gap-2 p-3'>
      {record ? (
        <RecordTitle record={record} />
      ) : (
        !readonly && <h3 className='text-lg font-medium'>New {Type.getTypename(recordType).split('.').at(-1)}</h3>
      )}
      <Form.Root
        // A new subject starts a new form, rather than carrying the previous one's values over.
        key={record?.id ?? Type.getTypename(recordType)}
        schema={schema}
        values={values}
        db={db}
        readonly={readonly}
        getOptions={getOptions}
        useType={useRefType}
        onSave={handleSave}
      >
        <Form.Content>
          <Form.Fields exclude={['id']} />
          {!readonly && <Form.Actions />}
        </Form.Content>
      </Form.Root>
    </div>
  );
};
