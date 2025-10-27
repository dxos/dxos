//
// Copyright 2024 DXOS.org
//

import { batch } from '@preact/signals-core';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { DXN, Obj, Tag, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';

import { meta as pluginMeta } from '../../meta';

// TODO(wittjosiah): Would be nice to control order when extending so this isn't always first/last.
const BaseSchema = Schema.Struct({
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

  const formSchema = useMemo(() => {
    return Function.pipe(
      Obj.getSchema(object),
      Option.fromNullable,
      Option.map((schema) => BaseSchema.pipe(Schema.extend(schema))),
      Option.getOrUndefined,
    );
  }, [object]);

  const meta = Obj.getMeta(object);
  const tag = meta.tags?.[0] ? space?.db.ref(DXN.parse(meta.tags?.[0])) : undefined;
  const values = useMemo(
    () => ({
      tag,
      ...object,
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
    ({ tag, ...values }: Schema.Schema.Type<typeof formSchema>) => {
      batch(() => {
        const meta = Obj.getMeta(object);
        const currentTag = meta.tags?.[0];
        if (tag !== undefined && currentTag !== tag?.dxn.toString()) {
          meta.tags = [tag.dxn.toString()];
        }

        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== object[key as keyof Obj.Any]) {
            Object.defineProperty(object, key, { value });
          }
        });
      });
    },
    [object],
  );

  if (!formSchema) {
    return null;
  }

  return (
    <>
      <Form
        outerSpacing={false}
        autoSave
        schema={formSchema}
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
