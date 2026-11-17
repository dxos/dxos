//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';

import { useContributions } from '../hooks.ts';
import { Note, Section, type ViewProps } from './common.tsx';

type Field = { name: string; type: string; optional: boolean };

const typeName = (ast: SchemaAST.AST): string =>
  SchemaAST.isUnion(ast)
    ? ast.types
        .filter((member) => !SchemaAST.isUndefinedKeyword(member))
        .map(typeName)
        .join(' | ')
    : SchemaAST.isStringKeyword(ast)
      ? 'string'
      : SchemaAST.isNumberKeyword(ast)
        ? 'number'
        : SchemaAST.isBooleanKeyword(ast)
          ? 'boolean'
          : ast._tag;

const fieldsOf = (type: Type.AnyEntity): Field[] => {
  const ast = SchemaAST.toType(Type.getSchema(type).ast);
  return SchemaAST.isObjects(ast)
    ? SchemaAST.getPropertySignatures(ast)
        .filter(({ name }) => name !== 'id')
        .map(({ name, type }) => ({
          name: String(name),
          type: typeName(type),
          optional: SchemaAST.isOptional(type),
        }))
    : [];
};

/** Each type the module contributes, with its fields. */
export const SchemaView = ({ moduleId }: ViewProps) => {
  const types = useContributions([moduleId], AppCapabilities.Schema).flat();

  if (types.length === 0) {
    return <Note>This module contributes no types.</Note>;
  }

  return (
    <>
      {types.map((type) => (
        <Section key={Type.getTypename(type)} title={<span className='font-mono'>{Type.getTypename(type)}</span>}>
          <table className='text-sm'>
            <tbody>
              {fieldsOf(type).map(({ name, type, optional }) => (
                <tr key={name}>
                  <td className='font-mono pe-4 py-0.5'>
                    {name}
                    {optional && '?'}
                  </td>
                  <td className='font-mono py-0.5 text-description'>{type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}
    </>
  );
};
