//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ReactElement, useMemo } from 'react';

import { type Database, type Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ObjectPicker } from '@dxos/react-ui-form';

const CreateSchema = Schema.Struct({ name: Schema.String });

export type ObjectAddPickerProps = {
  db?: Database.Database;
  filter: Filter.Any;
  /** Ids already present, e.g. the map's features; they are not offered. */
  exclude?: readonly string[];
  trigger: ReactElement;
  onSelect: (id: string) => void;
  /** With this, an unmatched query offers to create an object named after it. */
  onCreate?: (name: string) => unknown | Promise<unknown>;
};

/** A toolbar or row button that picks one object of a type to add. */
export const ObjectAddPicker = ({ db, filter, exclude, trigger, onSelect, onCreate }: ObjectAddPickerProps) => {
  // Queried while mounted rather than on open: results landing while the user types reset the popup's query, which
  // drops the create row for what they typed.
  const objects = useQuery(db, filter);
  const options = useMemo(() => {
    const excluded = new Set(exclude);
    return objects
      .filter((object) => !excluded.has(object.id))
      .map((object) => ({ id: object.id, label: Obj.getLabel(object) ?? object.id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [objects, exclude]);

  return (
    <ObjectPicker
      options={options}
      trigger={trigger}
      onSelect={(id) => id && onSelect(id)}
      {...(onCreate && {
        createSchema: CreateSchema,
        createInitialValuePath: 'name',
        onCreate: ({ name }: { name: string }) => onCreate(name),
      })}
    />
  );
};
