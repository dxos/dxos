//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { DXN, Obj, Tag, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';

import { meta as pluginMeta } from '../../meta';

const BaseSchema = Schema.Struct({
  label: Schema.String.pipe(Schema.optional),
  // TODO(wittjosiah): Support multiple tags.
  tag: Type.Ref(Tag.Tag).pipe(Schema.optional),
});

// TODO(wittjosiah): Better way to support validation of object schemas?
const TagSchema = Tag.Tag.pipe(Schema.omit('id'));

export type BaseObjectSettingsProps = ThemedClassName<
  PropsWithChildren<{
    object: Obj.Any;
  }>
>;

// TODO(wittjosiah): Reconcile w/ ObjectDetailsPanel.
export const BaseObjectSettings = ({ classNames, children, object }: BaseObjectSettingsProps) => {
  const space = getSpace(object);
  const handleRefQueryLookup = useRefQueryLookupHandler({ space });

  const meta = Obj.getMeta(object);
  const tag = meta.tags?.[0] ? space?.db.ref(DXN.parse(meta.tags?.[0])) : undefined;
  const values = useMemo(
    () => ({
      label: Obj.getLabel(object),
      tag,
    }),
    [object, tag],
  );

  const handleCreateTag = useCallback((values: Schema.Schema.Type<typeof TagSchema>) => {
    invariant(space);
    const tag = space.db.add(Tag.make(values));
    const meta = Obj.getMeta(object);
    meta.tags = [Obj.getDXN(tag).toString()];
  }, []);

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
    },
    [object],
  );

  // TODO(wittjosiah): The schema for this form should be based on the schema of the object.
  //  Perhaps with fields filtered down to only those with a specific settings annotation.
  return (
    <>
      <Form
        outerSpacing={false}
        autoSave
        schema={BaseSchema}
        values={values}
        createSchema={TagSchema}
        createOptionIcon='ph--plus--regular'
        createOptionLabel={['add tag label', { ns: pluginMeta.id }]}
        createInitialValuePath='label'
        onCreate={handleCreateTag}
        onSave={handleSave}
        onQueryRefOptions={handleRefQueryLookup}
      />
      {children}
    </>
  );
};
