//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AbstractSchema } from '@dxos/echo-schema';
import { AST, getAnnotation } from '@dxos/effect';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type SchemaEditorProps = ThemedClassName<{
  schema: AbstractSchema;
}>;

export const SchemaEditor = ({ classNames, schema }: SchemaEditorProps) => {
  const description = getAnnotation<AST.DescriptionAnnotation>(AST.DescriptionAnnotationId, schema.ast);
  return <div className={mx('p-2', classNames)}>{description}</div>;
};
