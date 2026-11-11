//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type Database, Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Form, omitId } from '@dxos/react-ui-form';

import { staffOf } from '../queries.ts';
import { addRecord, updateRecord } from '../records.ts';
import { Organization, type Person } from '../schema.ts';

// #region title
/** Re-renders whenever any peer renames the record. */
const RecordTitle = ({ record }: { record: Obj.Unknown }) => {
  const [snapshot] = useObject(record);
  return <h3 className='text-lg font-medium'>{Obj.getLabel(snapshot)}</h3>;
};
// #endregion

type RecordViewProps = {
  db: Database.Database;
  type: Type.AnyObj;
  record?: Obj.Unknown;
};

/** The record's fields, read-only. */
const RecordView = ({ db, type, record }: RecordViewProps) => {
  const [snapshot] = useObject(record);
  const schema = useMemo(() => omitId(type), [type]);
  const values = useMemo(
    () => Object.fromEntries(Object.entries(snapshot ?? {})),
    [snapshot],
  );
  return (
    <Form.Root schema={schema} db={db} values={values} readonly>
      <Form.Content>
        <Form.Fields />
      </Form.Content>
    </Form.Root>
  );
};

type NewRecordProps = {
  db: Database.Database;
  type: Type.AnyObj;
  onCreate: (record: Obj.Unknown) => void;
};

// #region create
/** A blank form for `type`; saving adds the new record to the database. */
const NewRecord = ({ db, type, onCreate }: NewRecordProps) => {
  const schema = useMemo(() => omitId(type), [type]);
  const handleSave = useCallback(
    (values: Record<string, unknown>) => onCreate(addRecord(db, type, values)),
    [db, type, onCreate],
  );

  return (
    <Form.Root schema={schema} db={db} onSave={handleSave}>
      <Form.Content>
        <Form.Fields />
        <Form.Actions />
      </Form.Content>
    </Form.Root>
  );
};
// #endregion

type EditRecordProps = {
  db: Database.Database;
  type: Type.AnyObj;
  record: Obj.Unknown;
};

// #region edit
/** The record's fields; each change is written back as it is made. */
const EditRecord = ({ db, type, record }: EditRecordProps) => {
  const [snapshot] = useObject(record);
  const schema = useMemo(() => omitId(type), [type]);
  const values = useMemo(
    () => Object.fromEntries(Object.entries(snapshot ?? {})),
    [snapshot],
  );
  const handleChange = useCallback(
    (
      values: Record<string, unknown>,
      {
        isValid,
        changed,
      }: { isValid: boolean; changed: Record<string, boolean> },
    ) => {
      // A changed path such as `attendees[0]` rewrites the whole field.
      const fields = new Set(
        Object.keys(changed)
          .filter((path) => changed[path])
          .map((path) => path.split(/[.[]/)[0]),
      );
      if (isValid && fields.size > 0) {
        updateRecord(
          record,
          Object.fromEntries(
            [...fields].map((field) => [field, values[field]]),
          ),
        );
      }
    },
    [record],
  );

  return (
    <Form.Root
      schema={schema}
      db={db}
      values={values}
      onValuesChanged={handleChange}
    >
      <Form.Content>
        <Form.Fields />
      </Form.Content>
    </Form.Root>
  );
};
// #endregion

/** The people who work at `organization`. */
const Staff = ({
  db,
  organization,
}: {
  db: Database.Database;
  organization: Organization;
}) => {
  const [staff, setStaff] = useState<Person[]>();
  useEffect(() => {
    void staffOf(db, organization).then(setStaff);
  }, [db, organization]);

  return staff && staff.length > 0 ? (
    <div className='flex flex-col gap-1'>
      <h4 className='text-sm text-description'>People</h4>
      <ul className='text-sm'>
        {staff.map((person) => (
          <li key={person.id}>{person.name}</li>
        ))}
      </ul>
    </div>
  ) : null;
};

export type RecordFormProps = {
  db: Database.Database;
  type: Type.AnyObj;
  record?: Obj.Unknown;
  editable?: boolean;
  /** Lists an organization's people under its fields. */
  showStaff?: boolean;
  onCreate: (record: Obj.Unknown) => void;
};

/**
 * Shows `record`, edits it when `editable`, or creates a record of `type` when
 * there is none.
 */
export const RecordForm = ({
  db,
  type,
  record,
  editable,
  showStaff,
  onCreate,
}: RecordFormProps) => {
  const recordType = (record && Obj.getType(record)) ?? type;
  return (
    <div className='flex flex-col gap-2 p-3'>
      {record ? (
        <RecordTitle record={record} />
      ) : (
        editable && (
          <h3 className='text-lg font-medium'>
            New {Type.getTypename(recordType).split('.').at(-1)}
          </h3>
        )
      )}
      {!editable ? (
        <RecordView
          key={record?.id}
          db={db}
          type={recordType}
          record={record}
        />
      ) : record ? (
        <EditRecord key={record.id} db={db} type={recordType} record={record} />
      ) : (
        <NewRecord
          key={Type.getTypename(recordType)}
          db={db}
          type={recordType}
          onCreate={onCreate}
        />
      )}
      {showStaff && record && Obj.instanceOf(Organization, record) && (
        <Staff key={record.id} db={db} organization={record} />
      )}
    </div>
  );
};
