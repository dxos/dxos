//
// Copyright 2023 DXOS.org
//

import { type AiService } from '@dxos/ai';
import { type Database, type Feed } from '@dxos/echo';

import { type Credential, type Operation, type Trace } from '@dxos/compute';

import { type FunctionInvocationService, type QueueService } from './services';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Services that are available to invoked functions.
 * @deprecated
 */
export type FunctionServices =
  | AiService.AiService
  | Credential.CredentialsService
  | Database.Service
  // TODO(wittjosiah): Remove QueueService — use Feed.FeedService instead.
  | QueueService
  | Feed.FeedService
  | Trace.TraceService
  | FunctionInvocationService
  | Operation.Service;
