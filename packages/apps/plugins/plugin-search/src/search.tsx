//
// Copyright 2023 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';

import { Text } from '@dxos/client/echo';

// Plain text fields.
export type TextFields = Record<string, string>;

export type SearchResult = {
  id: string;
  label: string;
  snippet?: string;
  Icon?: Icon;
  object?: any;
};

export const filterObjects = (objects: any[], match: RegExp): SearchResult[] => {
  return objects.reduce<SearchResult[]>((results, object) => {
    const fields = mapObjectToTextFields(object);
    Object.entries(fields).some(([, value]) => {
      const result = value.match(match);
      if (result) {
        const label = object.label ?? object.name ?? object.title;
        results.push({
          id: object.id,
          label,
          snippet: value, // TODO(burdon): Truncate.
          object,
        });

        return true;
      }

      return false;
    });

    return results;
  }, []);
};

// TODO(burdon): Use schema.
export const mapObjectToTextFields = (object: any): TextFields => {
  return Object.keys(object).reduce<TextFields>((value, key) => {
    if (key !== 'id' && (typeof object[key] === 'string' || object[key] instanceof Text)) {
      value[key] = String(object[key]);
    }

    return value;
  }, {});
};
