//
// Copyright 2025 DXOS.org
//

import { json as jsonLanguage, jsonParseLinter } from '@codemirror/lang-json';
import { type LintSource, linter } from '@codemirror/lint';
import { type Extension } from '@codemirror/state';
import Ajv, { type ValidateFunction } from 'ajv';

import { type JsonSchema as JsonSchemaType } from '@dxos/echo/JsonSchema';

export type JsonOptions = {
  schema?: JsonSchemaType;
};

/**
 * JSON editing extension: the JSON language (syntax highlighting, folding, bracket matching) plus a
 * linter. When `schema` (a JSON Schema) is given the linter validates against it; otherwise it reports
 * only parse errors.
 */
export const json = ({ schema }: JsonOptions = {}): Extension => {
  let lintSource: LintSource = jsonParseLinter();
  if (schema) {
    // NOTE: Relaxing strict mode to allow additional custom schema properties.
    const ajv = new Ajv({ allErrors: false, strict: false });
    const validate = ajv.compile(schema);
    lintSource = schemaLinter(validate);
  }

  return [jsonLanguage(), linter(lintSource)];
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
        validate.errors?.map((err) => ({
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
          message: 'Invalid JSON: ' + (err instanceof Error ? err.message : String(err)),
        },
      ];
    }
  };
