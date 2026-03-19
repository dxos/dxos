//
// Copyright 2023 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type AiService } from '@dxos/ai';
import { type Feed, JsonSchema, Obj, type Type } from '@dxos/echo';
import { type Database } from '@dxos/echo';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import {
  type CredentialsService,
  type FunctionInvocationService,
  type QueueService,
  type TracingService,
} from './services';
import { getUserFunctionIdInMetadata, setUserFunctionIdInMetadata } from './types';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Services that are provided at the function call site by the caller.
 */
export type InvocationServices = TracingService;

/**
 * Services that are available to invoked functions.
 */
export type FunctionServices =
  | InvocationServices
  | AiService.AiService
  | CredentialsService
  | Database.Service
  // TODO(wittjosiah): Remove QueueService — use Feed.Service instead.
  | QueueService
  | Feed.Service
  | FunctionInvocationService;
