//
// Copyright 2023 DXOS.org
//

import { type AiService } from '@dxos/ai';
import { type Credential, type Operation, type Trace } from '@dxos/compute';
import { type Database, type Feed } from '@dxos/echo';

import { type FunctionInvocationService } from './services';

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
  | Feed.FeedService
  | Trace.TraceService
  // TODO(dmaretskyi): `FunctionInvocationService` is being phased out in favour of `Operation.Service`;
  // it's kept in the union until `functions-runtime/local-function-execution.ts` migrates.
  | FunctionInvocationService
  | Operation.Service;
