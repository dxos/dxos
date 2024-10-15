//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { AST, type S } from '@dxos/effect';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { getAnnotation } from '../../types';

export type SchemaEditorProps = ThemedClassName<{
  schema: S.Struct<any>;
}>;

export const SchemaEditor = ({ classNames, schema }: SchemaEditorProps) => {
  const description = getAnnotation<AST.DescriptionAnnotation>(AST.DescriptionAnnotationId)(schema.ast);
  return <div className={mx('p-2', classNames)}>{description}</div>;
};
