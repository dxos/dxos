//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as SchemaAST from 'effect/SchemaAST';

import { type NumberLayout } from '@dxos/ui-types';

import { NumberLayoutAnnotation } from '../../annotations.ts';

/** The layout a number field's schema declares; none leaves the input's defaults. */
export const numberLayoutOf = (type: SchemaAST.AST): NumberLayout =>
  Option.getOrElse(NumberLayoutAnnotation.getFromAst(type), () => ({}));
