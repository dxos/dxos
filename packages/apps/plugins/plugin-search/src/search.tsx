//
// Copyright 2023 DXOS.org
//

import { type Icon, Buildings, Folders, User } from '@phosphor-icons/react';

import { type Schema, Text } from '@dxos/client/echo';

// Plain text fields.
// TODO(burdon): Reconcile with agent index.
export type TextFields = Record<string, string>;

export type SearchResult = {
  id: string;
  type?: string;
  label?: string;
  match?: RegExp;
  snippet?: string;
  object?: any;
  Icon?: Icon;
};

export const filterObjects = <T extends Record<string, any>>(objects: T[], match: RegExp): SearchResult[] => {
  return objects.reduce<SearchResult[]>((results, object) => {
    const fields = mapObjectToTextFields(object);
    Object.entries(fields).some(([, value]) => {
      const result = value.match(match);
      if (result) {
        const label = getStringProperty(object, ['label', 'name', 'title']);

        results.push({
          id: object.id,
          label,
          match,
          snippet: value !== label ? value : fields.description ?? undefined, // TODO(burdon): Truncate.
          Icon: object.__schema ? getIcon(object.__schema) : undefined,
          object,
        });

        return true;
      }

      return false;
    });

    return results;
  }, []);
};

// TODO(burdon): Registry (serialized icon or by name?)
const getIcon = (schema: Schema): Icon | undefined => {
  const keys = schema.props.map((prop) => prop.id);
  if (keys.indexOf('email') !== -1) {
    return User;
  }
  if (keys.indexOf('website') !== -1) {
    return Buildings;
  }
  if (keys.indexOf('repo') !== -1) {
    return Folders;
  }

  return undefined;
};

// TODO(burdon): Use schema?
const getStringProperty = (object: Record<string, unknown>, keys: string[]): string | undefined => {
  let label;
  keys.some((key) => {
    const value = object[key];
    if (typeof value === 'string') {
      label = value;
      return true;
    }

    return false;
  });

  return label;
};

// TODO(burdon): Filter system fields.
const getKeys = (object: Record<string, unknown>): string[] => {
  const obj = JSON.parse(JSON.stringify(object));
  return Object.keys(obj).filter((key) => key !== 'id' && key[0] !== '_' && key[0] !== '@') as string[];
};

// TODO(burdon): Use ECHO schema.
export const mapObjectToTextFields = <T extends Record<string, unknown>>(object: T): TextFields => {
  return getKeys(object).reduce<TextFields>((fields, key) => {
    const value = object[key] as any;
    if (typeof value === 'string' || value instanceof Text) {
      try {
        fields[key] = String(value);
      } catch (err) {
        // TODO(burdon): Exception when parsing sketch document.
      }
    }

    return fields;
  }, {});
};
