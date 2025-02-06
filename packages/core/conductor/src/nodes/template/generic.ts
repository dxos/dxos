//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { applyObjectTemplate, getObjectTemplateInputSchema } from './json';
import { applyTextTemplate, getTextTemplateInputSchema } from './text';
import type { ComputeNode } from '../../types/graph';

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

export const getTemplateInputSchema = (node: ComputeNode): S.Schema.AnyNoContext => {
  switch (node.valueType) {
    case 'string':
      return getTextTemplateInputSchema(node.value ?? '');
    case 'object':
      return getObjectTemplateInputSchema(node.value ?? '');
    default:
      return S.Struct({});
  }
};
