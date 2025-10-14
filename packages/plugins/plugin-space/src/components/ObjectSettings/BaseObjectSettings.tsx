//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { DXN, Obj, Tag, Type } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';

const BaseSchema = Schema.Struct({
  label: Schema.String.pipe(Schema.optional),
  tag: Type.Ref(Tag.Tag).pipe(Schema.optional),
});

export type BaseObjectSettingsProps = ThemedClassName<
  PropsWithChildren<{
    object: Obj.Any;
  }>
>;

export const BaseObjectSettings = ({ classNames, children, object }: BaseObjectSettingsProps) => {
  const space = getSpace(object);
  const handleRefQueryLookup = useRefQueryLookupHandler({ space });

  const values = useMemo(() => {
    const meta = Obj.getMeta(object);
    const tag = meta.tags?.[0] ? space?.db.ref(DXN.parse(meta.tags?.[0])) : undefined;

    return {
      label: Obj.getLabel(object),
      tag,
    };
  }, [object]);

  const handleSave = useCallback(
    (values: Schema.Schema.Type<typeof BaseSchema>) => {
      if (values.label !== undefined && Obj.getLabel(object) !== values.label) {
        Obj.setLabel(object, values.label);
      }

      const meta = Obj.getMeta(object);
      const currentTag = meta.tags?.[0];
      if (values.tag !== undefined && currentTag !== values.tag?.dxn.toString()) {
        meta.tags = [values.tag.dxn.toString()];
      }

      console.log(object);
    },
    [object],
  );

  // TODO(wittjosiah): This should be a form based on the schema of the object.
  //  The form should only include fields with a specific settings annotation.
  //  Perhaps also including the field of the title annotation as well.
  return (
    <>
      <Form autoSave schema={BaseSchema} values={values} onSave={handleSave} onQueryRefOptions={handleRefQueryLookup} />
      {/* <Input.Root>
        <Input.Label>{t('name label')}</Input.Label>
        <Input.TextInput
          ref={inputRef}
          placeholder={t('name placeholder')}
          // TODO(burdon): Use annotation to get the name field.
          value={(object as any).name ?? ''}
          onChange={(event) => {
            (object as any).name = event.target.value;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              inputRef.current?.blur();
            }
          }}
        />
      </Input.Root> */}
      {children}
    </>
  );
};
