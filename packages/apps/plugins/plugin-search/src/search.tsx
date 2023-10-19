//
// Copyright 2023 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';

import { Text } from '@dxos/client/echo';

// TODO(burdon): Reconcile with agent index.

// Plain text fields.
export type TextFields = Record<string, string>;

export type SearchResult = {
  id: string;
  label: string;
  match?: RegExp;
  snippet?: string;
  Icon?: Icon;
  object?: any;
};

// TODO(burdon): Unit test.

export const filterObjects = <T extends Record<string, any>>(objects: T[], match: RegExp): SearchResult[] => {
  return objects.reduce<SearchResult[]>((results, object) => {
    const fields = mapObjectToTextFields(object);
    Object.entries(fields).some(([, value]) => {
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
    if (key !== 'id' && (typeof value === 'string' || value instanceof Text)) {
      try {
        fields[key] = String(value);
      } catch (err) {
        // TODO(burdon): Exception when parsing sketch document.
      }
    }

    return fields;
  }, {});
};
