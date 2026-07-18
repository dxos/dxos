//
// Copyright 2023 DXOS.org
//

import { type AiService } from '@dxos/ai';
import { type Credential, type Operation, type Trace } from '@dxos/compute';
import { type Database } from '@dxos/echo';

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
  | Trace.TraceService
  | Operation.Service;
