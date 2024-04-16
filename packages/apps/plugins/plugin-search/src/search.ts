//
// Copyright 2023 DXOS.org
//

import { TextV0Type } from '@braneframe/types';
import type { S } from '@dxos/echo-schema';
import { AST } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';

// TODO(burdon): Type name registry linked to schema?
const getIcon = (schema: S.Schema<any> | undefined): string | undefined => {
  if (!(schema && AST.isTypeLiteral(schema.ast))) {
    return undefined;
  }
  const keys = schema.ast.propertySignatures.map((p) => p.name);
  if (keys.indexOf('email') !== -1) {
    return 'user';
  }
  if (keys.indexOf('website') !== -1) {
    return 'organization';
  }
  if (keys.indexOf('repo') !== -1) {
    return 'project';
  }

  return undefined;
};

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
};

export const filterObjects = <T extends Record<string, any>>(objects: T[], match?: RegExp): SearchResult[] => {
  if (!match) {
    return [];
  }

  return objects.reduce<SearchResult[]>((results, object) => {
    // TODO(burdon): Hack to ignore Text objects.
    if (object instanceof TextV0Type) {
      return results;
    }

    const fields = mapObjectToTextFields(object);
    Object.entries(fields).some(([, value]) => {
      const result = value.match(match);
      if (result) {
        // TODO(burdon): Use schema.
        const label = getStringProperty(object, ['label', 'name', 'title']);

        results.push({
          id: object.id,
          type: getIcon(E.getSchema(object)),
          label,
          match,
          // TODO(burdon): Truncate.
          // TODO(burdon): Issue with sketch documents.
          snippet: value !== label ? value : fields.content ?? fields.description ?? undefined,
          object,
        });

        return true;
      }

      return false;
    });

    return results;
  }, []);
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
  try {
    const obj = JSON.parse(JSON.stringify(object));
    return Object.keys(obj).filter(
      (key) => key !== 'id' && key !== 'identityKey' && key[0] !== '_' && key[0] !== '@',
    ) as string[];
  } catch (err) {
    // TODO(burdon): Error with TLDraw sketch.
    //  Uncaught Error: Type with the name content has already been defined with a different constructor
    return [];
  }
};

// TODO(burdon): Use ECHO schema.
export const mapObjectToTextFields = <T extends Record<string, unknown>>(object: T): TextFields => {
  return getKeys(object).reduce<TextFields>((fields, key) => {
    const value = object[key] as any;
    if (typeof value === 'string' || value instanceof TextV0Type) {
      try {
        fields[key] = String(value);
      } catch (err) {
        // TODO(burdon): Exception when parsing sketch document.
      }
    }

    return fields;
  }, {});
};
