//
// Copyright 2023 DXOS.org
//

import { type Reference } from '@dxos/echo-protocol';
import { type EchoReactiveObject } from '@dxos/echo-schema';

export type DecodedAutomergePrimaryValue =
  | undefined
  | string
  | number
  | boolean
  | DecodedAutomergePrimaryValue[]
  | { [key: string]: DecodedAutomergePrimaryValue }
  | Reference;

/**
 * @deprecated Use DecodedAutomergePrimaryValue instead.
 */
export type DecodedAutomergeValue =
  | undefined
  | string
  | number
  | boolean
  | DecodedAutomergeValue[]
  | { [key: string]: DecodedAutomergeValue }
  | Reference
  | EchoReactiveObject<any>;
