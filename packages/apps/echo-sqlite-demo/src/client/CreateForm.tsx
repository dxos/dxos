//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import { Form, omitId } from '@dxos/react-ui-form';
import type { RefOption } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Organization, Person, types } from '../schema.ts';
import { foreignKey } from './sync.ts';

/**
 * Create either type from its own schema.
 *
 * The form is driven entirely by `Type.getSchema(...)`, so switching the selector re-renders a
 * different set of fields with no per-type markup — Person gains `email` and the `employer` ref,
 * Organization does not. `employer` resolves through `getOptions`, which is what turns it into a
 * picker rather than a text box.
 */
export const CreateForm = ({
  db,
  organizations,
  onCreated,
}: {
  db: SqliteDatabase;
  organizations: readonly Organization[];
  onCreated?: () => void;
}) => {
  const [typename, setTypename] = useState<string>(Type.getTypename(Person)!);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const type = useMemo(() => types.find((type) => Type.getTypename(type) === typename) ?? Person, [typename]);
  // `id` is on every schema and is not something anyone fills in.
  const schema = useMemo(() => omitId(type), [type]);

  const items = useMemo(
    () => types.map((type) => ({ value: Type.getTypename(type)!, label: Type.getTypename(type)!.split('.').pop()! })),
    [],
  );

  /** Candidates for the `employer` ref, addressed the way the form reports a chosen value. */
  const getOptions = useCallback(
    (): RefOption[] => organizations.map((org) => ({ id: Entity.getURI(org, { prefer: 'named' }), label: org.name })),
    [organizations],
  );

  const useRefType = useCallback(() => Organization, []);

  const handleSave = useCallback(
    (next: Record<string, unknown>) => {
      const { employer, ...props } = next;
      // The form reports a ref as its URI; map it back to the object before storing a Ref.
      const target =
        typeof employer === 'string'
          ? organizations.find((org) => Entity.getURI(org, { prefer: 'named' }) === employer)
          : undefined;

      db.add(
        Obj.make(
          type as never,
          {
            [Obj.Meta]: { keys: [foreignKey(crypto.randomUUID())] },
            ...props,
            ...(target ? { employer: Ref.make(target as never) } : {}),
          } as never,
        ),
      );
      setValues({});
      onCreated?.();
    },
    [db, organizations, type, onCreated],
  );

  return (
    <Card.Root classNames='m-3 max-w-xl mx-auto'>
      <Toolbar.Root>
        <Toolbar.Text>New</Toolbar.Text>
        <Select.Root items={items} value={[typename]} onValueChange={({ value }) => setTypename(value[0])}>
          <Select.Trigger placeholder='Type' aria-label='Type' />
          <Select.Content>
            {items.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
      </Toolbar.Root>

      <Form.Root
        // Remounting on type change drops the previous type's values rather than carrying them over.
        key={typename}
        schema={schema}
        values={values}
        getOptions={getOptions}
        useType={useRefType}
        onSave={handleSave}
        onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
      >
        <Form.Content>
          <Form.Fields exclude={['id']} />
          <Form.Actions />
        </Form.Content>
      </Form.Root>
    </Card.Root>
  );
};
