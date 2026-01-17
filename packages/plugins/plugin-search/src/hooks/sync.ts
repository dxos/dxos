//
// Copyright 2023 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { Obj } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { type SearchResult } from '../types';

export const queryStringToMatch = (queryString?: string): RegExp | undefined => {
  const trimmed = queryString?.trim();
  return trimmed ? new RegExp(trimmed, 'i') : undefined;
};

// TODO(burdon): Type name registry linked to schema?
const getIcon = (schema: Schema.Schema.AnyNoContext | undefined): string | undefined => {
  if (!(schema && SchemaAST.isTypeLiteral(schema.ast))) {
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

// TODO(thure): This returns `SearchResult[]` which is not just a narrower set of objects as the name implies.
export const filterObjectsSync = <T extends Record<string, any>>(objects: T[], match?: RegExp): SearchResult[] => {
  if (!match) {
    return [];
  }

  return objects.reduce<SearchResult[]>((results, object) => {
    // TODO(burdon): Hack to ignore Text objects.
    if (object instanceof Text.Text) {
      return results;
    }

    const fields = mapObjectToTextFields(object);
    Object.entries(fields).some(([, value]) => {
      // TODO(burdon): Use schema.
      const label = Obj.getLabel(object as any);

      results.push({
        id: object.id,
        type: getIcon(Obj.getSchema(object)),
        label,
        match,
        // TODO(burdon): Truncate.
        // TODO(burdon): Issue with sketch documents.
        snippet: value !== label ? value : (fields.content ?? fields.description ?? undefined),
        object,
      });

      return true;
    });

    return results;
  }, []);
};

// TODO(burdon): Use schema?
export const getStringProperty = (object: any, keys: string[]): string | undefined => {
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
    if (typeof value === 'string' || value instanceof Text.Text) {
      try {
        fields[key] = String(value);
      } catch (err) {
        // TODO(burdon): Exception when parsing sketch document.
      }
    }

    return fields;
  }, {});
};
