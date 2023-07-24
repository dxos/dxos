//
// Copyright 2023 DXOS.org
//

import { EchoObject } from '@dxos/client/echo';

import { GenericStackObject, StackModel, StackObject, StackProperties } from './types';

export const STACK_PLUGIN = 'dxos:stack';

export const isStack = <T extends StackObject = GenericStackObject>(datum: unknown): datum is StackModel<T> =>
  datum && typeof datum === 'object'
    ? 'id' in datum &&
      typeof datum.id === 'string' &&
      typeof (datum as { [key: string]: any }).sections === 'object' &&
      typeof (datum as { [key: string]: any }).sections?.length === 'number'
    : false;

export const isStackProperties = (datum: unknown): datum is StackProperties => datum instanceof EchoObject;
