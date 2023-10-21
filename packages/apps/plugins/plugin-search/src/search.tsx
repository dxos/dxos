//
// Copyright 2023 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';

import { Text } from '@dxos/client/echo';

// Plain text fields.
// TODO(burdon): Reconcile with agent index.
export type TextFields = Record<string, string>;

export type SearchResult = {
  id: string;
  label: string;
  match?: RegExp;
  snippet?: string;
  Icon?: Icon; // TODO(burdon): Registry.
  object?: any;
};

export const filterObjects = <T extends Record<string, any>>(objects: T[], match: RegExp): SearchResult[] => {
  return objects.reduce<SearchResult[]>((results, object) => {
    const fields = mapObjectToTextFields(object);
    Object.entries(fields).some(([key, value]) => {
      const result = value.match(match);
      if (result) {
        const label = object.label ?? object.name ?? object.title;
        results.push({
          id: object.id,
          label,
          match,
          snippet: value !== label ? value : undefined, // TODO(burdon): Truncate.
          object,
        });

        return true;
      }

      return false;
    });

    return results;
  }, []);
};

// TODO(burdon): Use ECHO schema.
export const mapObjectToTextFields = (object: any): TextFields => {
  return Object.keys(object).reduce<TextFields>((fields, key) => {
    const value = object[key];
    // TODO(burdon): Filter system fields.
    if (key !== 'id' && key[0] !== '_' && (typeof value === 'string' || value instanceof Text)) {
      try {
        fields[key] = String(value);
      } catch (err) {
        // TODO(burdon): Exception when parsing sketch document.
      }
    }

    return fields;
  }, {});
};
