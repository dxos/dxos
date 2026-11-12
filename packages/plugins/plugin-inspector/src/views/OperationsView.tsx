//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Operation from '@dxos/compute/Operation';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';

import { useContributions } from '../hooks.ts';
import { Note, Section, type ViewProps } from './common.tsx';

/** Each operation the module handles, run from a form built from its input schema. */
export const OperationsView = ({ moduleId, space, sample }: ViewProps) => {
  const definitions = useContributions([moduleId], Capabilities.OperationHandler).flatMap((value) =>
    value.definitions(),
  );

  if (definitions.length === 0) {
    return <Note>This module handles no operations.</Note>;
  }

  return (
    <>
      {definitions.map((definition) => (
        <OperationForm key={definition.meta.key} definition={definition} space={space} sample={sample} />
      ))}
    </>
  );
};

type Field = { name: string; kind: 'boolean' | 'number' | 'object' | 'string'; description?: string };

const describe = (description: unknown): string | undefined =>
  typeof description === 'string' ? description : undefined;

/** One form field per top-level input property; anything not a scalar takes the selected object. */
const fieldsOf = (definition: Operation.Definition.Any): Field[] => {
  const ast = SchemaAST.toType(definition.input.ast);
  if (!SchemaAST.isObjects(ast)) {
    return [];
  }
  return SchemaAST.getPropertySignatures(ast).map(({ name, type }) => ({
    name: String(name),
    kind: SchemaAST.isStringKeyword(type)
      ? 'string'
      : SchemaAST.isNumberKeyword(type)
        ? 'number'
        : SchemaAST.isBooleanKeyword(type)
          ? 'boolean'
          : 'object',
    description: describe(SchemaAST.getDescriptionAnnotation(type)),
  }));
};

type OperationFormProps = Pick<ViewProps, 'space' | 'sample'> & {
  definition: Operation.Definition.Any;
};

const OperationForm = ({ definition, space, sample }: OperationFormProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const fields = fieldsOf(definition);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>();

  const handleRun = async () => {
    const input = Object.fromEntries(
      fields.map(({ name, kind }) => [
        name,
        kind === 'object'
          ? sample
          : kind === 'number'
            ? Number(values[name])
            : kind === 'boolean'
              ? values[name] === 'true'
              : values[name],
      ]),
    );
    const { data, error } = await invokePromise(definition, input, { spaceId: space?.id });
    setResult(error ? `Error: ${error.message}` : JSON.stringify(data, null, 2));
  };

  const needsSubject = fields.some(({ kind }) => kind === 'object');

  return (
    <Section title={definition.meta.name ?? definition.meta.key}>
      {definition.meta.description && <p className='text-sm text-description'>{definition.meta.description}</p>}
      {fields.map(({ name, kind, description }) => (
        <label key={name} className='flex flex-col gap-1 text-sm'>
          <span>
            <span className='font-mono'>{name}</span>
            {description && <span className='text-description'> {description}</span>}
          </span>
          {kind === 'object' ? (
            <span className='text-description'>{sample ? 'The sample object.' : 'Create a sample object first.'}</span>
          ) : (
            <Input.Root
              value={values[name] ?? ''}
              onChange={(event) => setValues((values) => ({ ...values, [name]: event.target.value }))}
            />
          )}
        </label>
      ))}
      <div>
        <Button.Root label='Run' icon='ph--play--regular' disabled={needsSubject && !sample} onClick={handleRun} />
      </div>
      {result && <pre className='text-sm whitespace-pre-wrap rounded-md bg-input-surface p-2'>{result}</pre>}
    </Section>
  );
};
