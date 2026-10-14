//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import React, { useMemo } from 'react';

import { type Database, Entity, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import * as Combobox from '@dxos/react-ui/Combobox';
import * as Hooks from '@dxos/react-ui/Hooks';
import { hues } from '@dxos/ui-types';

import { TypeOptions } from '../../../echo/index.ts';

/** An object a picker offers: its URI, label and type icon. Structurally a form's `RefOption`. */
export type Option = {
  id: string;
  label: string;
  icon?: string;
  iconHue?: string;
};

export type OptionsProps = {
  /** Translates a type's `object-name.placeholder`, the label of an unnamed object. */
  t: (key: string, options: { ns: string; defaultValue: string }) => string | undefined;
  /** Drops objects the caller should not offer (e.g. the object being edited). */
  filter?: (object: Obj.Unknown) => boolean;
};

/**
 * The objects among `objects` a user finds in the navigator or a Database section, as options sorted by label: each
 * labelled by its name or, unnamed, by its type's placeholder, as the navigator shows it, with its type's icon.
 */
export const toOptions = (objects: readonly Entity.Any[], { t, filter }: OptionsProps): Option[] =>
  TypeOptions.filterListedObjects(objects)
    .filter((object) => !filter || filter(object))
    .map((object) => {
      const id = Entity.getURI(object, { prefer: 'named' });
      const typename = Obj.getTypename(object);
      const icon = Entity.getIcon(object);
      const label =
        Entity.getLabel(object) ??
        (typename && t('object-name.placeholder', { ns: typename, defaultValue: 'New item' })) ??
        id;
      return { id, label, icon: icon?.icon, iconHue: icon?.hue };
    })
    .toSorted((left, right) => left.label.localeCompare(right.label));

const everything = Query.select(Filter.everything());

/** The listed objects of `db` as options; see {@link toOptions}. */
export const useOptions = (db: Database.Database | undefined, filter?: OptionsProps['filter']): Option[] => {
  const { t } = Hooks.useTranslation();
  const objects = useQuery(db, everything);
  return useMemo(() => toOptions(objects, { t, filter }), [objects, t, filter]);
};

export type RootProps = {
  db?: Database.Database;
  /** The selected object's URI. */
  value?: string;
  placeholder?: string;
  filter?: OptionsProps['filter'];
  /** Called with the picked object's URI, or `undefined` when the selected one is picked again. */
  onValueChange: (value: string | undefined) => void;
};

/**
 * Picks one object of the space: a button showing the selection opens a popup whose search field narrows the listed
 * objects, each with its type icon.
 */
export const Root = ({ db, value, placeholder, filter, onValueChange }: RootProps) => {
  const options = useOptions(db, filter);
  const items = useMemo<Combobox.Option[]>(
    () =>
      options.map(({ id, label, icon, iconHue }) => ({
        value: id,
        label,
        icon,
        iconHue: hues.find((hue) => hue === iconHue),
      })),
    [options],
  );
  return (
    <Combobox.Root
      items={items}
      value={value ? [value] : []}
      onSelect={({ itemValue }) => onValueChange(itemValue === value ? undefined : itemValue)}
    >
      <Combobox.Trigger placeholder={placeholder} />
      <Combobox.Content />
    </Combobox.Root>
  );
};
