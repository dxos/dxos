//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Database, Obj, Type } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Form, ObjectForm, omitId } from '@dxos/react-ui-form';

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
    (values: Record<string, unknown>) =>
      onCreate(db.add(Obj.make(type, values))),
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

export type RecordFormProps = {
  db: Database.Database;
  type: Type.AnyObj;
  record?: Obj.Unknown;
  editable?: boolean;
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
        <ObjectForm
          key={record.id}
          type={recordType}
          object={record}
          showTags={false}
        />
      ) : (
        <NewRecord
          key={Type.getTypename(recordType)}
          db={db}
          type={recordType}
          onCreate={onCreate}
        />
      )}
    </div>
  );
};
