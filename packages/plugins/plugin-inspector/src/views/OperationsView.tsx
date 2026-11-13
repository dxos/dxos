//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';
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

type Field = { name: string; kind: 'boolean' | 'number' | 'object' | 'ref' | 'string'; description?: string };

const describe = (description: unknown): string | undefined =>
  typeof description === 'string' ? description : undefined;

/** One form field per top-level input property; anything not a scalar takes the selected object, or a ref to it. */
const fieldsOf = (definition: Operation.Definition.Any): Field[] => {
  const ast = SchemaAST.toType(definition.input.ast);
  if (!SchemaAST.isObjects(ast)) {
    return [];
  }
  return SchemaAST.getPropertySignatures(ast).map(({ name, type: declared }) => {
    const type = withoutUndefined(declared);
    return {
      name: String(name),
      kind: SchemaAST.isStringKeyword(type)
        ? 'string'
        : SchemaAST.isNumberKeyword(type)
          ? 'number'
          : SchemaAST.isBooleanKeyword(type)
            ? 'boolean'
            : Ref.isRefType(type)
              ? 'ref'
              : 'object',
      description: describe(SchemaAST.getDescriptionAnnotation(type)),
    };
  });
};

/** An optional field's type is a union with `undefined`; the form edits the other member. */
const withoutUndefined = (type: SchemaAST.AST): SchemaAST.AST => {
  if (!SchemaAST.isUnion(type)) {
    return type;
  }
  const defined = type.types.filter((member) => !SchemaAST.isUndefinedKeyword(member));
  return defined.length === 1 ? defined[0] : type;
};

/** The object's own fields, without its id and metadata. */
const fieldsOfObject = (object: Obj.Unknown): Record<string, unknown> =>
  Object.fromEntries(Object.entries(Obj.toJSON(object)).filter(([key]) => !key.startsWith('@') && key !== 'id'));

type OperationFormProps = Pick<ViewProps, 'space' | 'sample'> & {
  definition: Operation.Definition.Any;
};

const OperationForm = ({ definition, space, sample }: OperationFormProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const fields = fieldsOf(definition);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>();

  const handleRun = async () => {
    // An empty field is left out, so an optional input takes its default.
    const input = Object.fromEntries(
      fields
        .filter(({ name, kind }) => kind === 'object' || kind === 'ref' || values[name])
        .map(({ name, kind }) => [
          name,
          kind === 'ref'
            ? sample && Ref.make(sample)
            : kind === 'object'
              ? sample
              : kind === 'number'
                ? Number(values[name])
                : kind === 'boolean'
                  ? values[name] === 'true'
                  : values[name],
        ]),
    );
    const { data, error } = await invokePromise(definition, input, { spaceId: space?.id });
    if (error) {
      setResult(`Error: ${error.message}`);
    } else if (data !== undefined) {
      setResult(JSON.stringify(data, null, 2));
    } else {
      // An operation with no output changes something; show the sample it ran on.
      setResult(sample ? `The sample is now:\n${JSON.stringify(fieldsOfObject(sample), null, 2)}` : 'Done.');
    }
  };

  const needsSubject = fields.some(({ kind }) => kind === 'object' || kind === 'ref');

  return (
    <Section title={definition.meta.name ?? definition.meta.key}>
      {definition.meta.description && <p className='text-sm text-description'>{definition.meta.description}</p>}
      {fields.map(({ name, kind, description }) => (
        <label key={name} className='flex flex-col gap-1 text-sm'>
          <span>
            <span className='font-mono'>{name}</span>
            {description && <span className='text-description'> {description}</span>}
          </span>
          {kind === 'object' || kind === 'ref' ? (
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
