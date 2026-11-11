//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useOperationInvoker } from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as Operation from '@dxos/compute/Operation';
import { type Obj } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { type Space } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';

import { useContributions } from '../hooks.ts';
import { Empty, type PanelProps, Section } from './common.tsx';

export type OperationsPanelProps = PanelProps & { space?: Space; subject?: Obj.Unknown };

/** The plugin's operations, each run from a form built from its input schema, and the tools its skills give. */
export const OperationsPanel = ({ pluginId, empty, space, subject }: OperationsPanelProps) => {
  const definitions = useContributions(pluginId, Capabilities.OperationHandler).flatMap(({ value }) =>
    value.definitions(),
  );
  const skills = useContributions(pluginId, AppCapabilities.SkillDefinition).map(({ value }) => value.make());

  if (definitions.length === 0 && skills.length === 0) {
    return <Empty>{empty}</Empty>;
  }

  return (
    <>
      {definitions.map((definition) => (
        <OperationForm key={definition.meta.key} definition={definition} space={space} subject={subject} />
      ))}
      {skills.map((skill) => (
        <Section key={skill.name} title={`Skill: ${skill.name}`}>
          <p className='text-sm text-description'>Tools it gives the assistant:</p>
          <ul className='text-sm font-mono'>
            {skill.tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </Section>
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

type OperationFormProps = Pick<OperationsPanelProps, 'space' | 'subject'> & {
  definition: Operation.Definition.Any;
};

const OperationForm = ({ definition, space, subject }: OperationFormProps) => {
  const { invokePromise } = useOperationInvoker();
  const fields = fieldsOf(definition);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>();

  const handleRun = async () => {
    const input = Object.fromEntries(
      fields.map(({ name, kind }) => [
        name,
        kind === 'object'
          ? subject
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
            <span className='text-description'>
              {subject ? 'The object selected in Types.' : 'Select an object in Types.'}
            </span>
          ) : (
            <Input.Root
              value={values[name] ?? ''}
              onChange={(event) => setValues((values) => ({ ...values, [name]: event.target.value }))}
            />
          )}
        </label>
      ))}
      <Button.Root label='Run' icon='ph--play--regular' disabled={needsSubject && !subject} onClick={handleRun} />
      {result && <pre className='text-sm whitespace-pre-wrap'>{result}</pre>}
    </Section>
  );
};
