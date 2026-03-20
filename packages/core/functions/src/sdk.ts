//
// Copyright 2023 DXOS.org
//

import { type AiService } from '@dxos/ai';
import { type Database, type Feed } from '@dxos/echo';

import {
  type CredentialsService,
  type FunctionInvocationService,
  type QueueService,
  type TracingService,
} from './services';

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
