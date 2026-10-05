//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Format, Type } from '@dxos/echo';
import { SchemaAST } from '@dxos/effect';
import { Task } from '@dxos/types';

import { TaskInputSchema } from './create-object.ts';

describe('TaskInputSchema', () => {
  const decode = Schema.decodeUnknownOption(TaskInputSchema);

  test('rejects a blank title', () => {
    expect(Option.isNone(decode({ title: '' }))).toBe(true);
    expect(Option.isNone(decode({ title: '   ' }))).toBe(true);
  });

  test('accepts a titled task with a description', () => {
    expect(Option.isSome(decode({ title: 'Roast', description: 'Light, then medium.' }))).toBe(true);
  });

  test('keeps every field of the task', () => {
    const names = (ast: SchemaAST.AST) => SchemaAST.getPropertySignatures(ast).map((property) => property.name);
    expect(names(TaskInputSchema.ast)).toEqual(names(Type.getSchema(Task.Task).ast).filter((name) => name !== 'id'));
  });

  test('edits the description as markdown', () => {
    const description = SchemaAST.getPropertySignatures(TaskInputSchema.ast).find(
      (property) => property.name === 'description',
    );
    // Optional, so the annotated string is a member of `string | undefined`.
    const members = description && SchemaAST.isUnion(description.type) ? description.type.types : [];
    expect(members.map((member) => Format.FormatAnnotation.getFromAst(member))).toContainEqual(
      Option.some(Format.TypeFormat.Markdown),
    );
  });
});
