//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

import type { ComputeNode } from '../../types/graph';

import { applyObjectTemplate, getObjectTemplateInputSchema } from './json';
import { applyTextTemplate, getTextTemplateInputSchema } from './text';

export const computeTemplate = (node: ComputeNode, props: Record<string, any>): unknown => {
  switch (node.valueType) {
    case 'string':
      return applyTextTemplate(node.value ?? '', props);
    case 'object': {
      let template: unknown;
      try {
        template = JSON.parse(node.value ?? '{}');
      } catch (error) {
        log.warn('Failed to parse template', { error });
        return applyTextTemplate(node.value ?? '', props);
      }
      return applyObjectTemplate(template, props);
    }
    default:
      return node.value;
  }
};

export const getTemplateInputSchema = (node: ComputeNode): Schema.Schema.AnyNoContext => {
  switch (node.valueType) {
    case 'string':
      return getTextTemplateInputSchema(node.value ?? '');
    case 'object':
      return getObjectTemplateInputSchema(node.value ?? '');
    default:
      return Schema.Struct({});
  }
};
