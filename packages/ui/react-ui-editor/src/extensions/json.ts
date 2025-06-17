//
// Copyright 2025 DXOS.org
//

import { json, jsonParseLinter } from '@codemirror/lang-json';
import { type LintSource, linter } from '@codemirror/lint';
import { type Extension } from '@codemirror/state';
import Ajv, { type ValidateFunction } from 'ajv';

import { type JsonSchemaType } from '@dxos/echo-schema';

export type JsonExtensionsOptions = {
  schema?: JsonSchemaType;
};

export const createJsonExtensions = ({ schema }: JsonExtensionsOptions = {}): Extension => {
  let lintSource: LintSource = jsonParseLinter();
  if (schema) {
    const ajv = new Ajv({ allErrors: false });
    const validate = ajv.compile(schema);
    lintSource = schemaLinter(validate);
  }

  return [json(), linter(lintSource)];
};

const schemaLinter =
  (validate: ValidateFunction): LintSource =>
  (view) => {
    try {
      const jsonText = view.state.doc.toString();
      const jsonData = JSON.parse(jsonText);
      const valid = validate(jsonData);
      if (valid) {
        return [];
      }

      return (
        validate.errors?.map((err: any) => ({
          from: 0,
          to: jsonText.length,
          severity: 'error',
          message: `${err.instancePath || '(root)'} ${err.message}`,
        })) ?? []
      );
    } catch (err: unknown) {
      return [
        {
          from: 0,
          to: view.state.doc.length,
          severity: 'error',
          message: 'Invalid JSON: ' + (err as Error).message,
        },
      ];
    }
  };
