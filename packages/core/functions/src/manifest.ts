//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';

// Lambda-like function definitions.
// See: https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions

export type FunctionDef = {
  // FQ function name.
  id: string;
  // URL path.
  name: string;
  // File path of handler.
  handler: string;
  description?: string;
};

// TODO(burdon): Query DSL.
export type TriggerSubscription = {
  type: string;
  spaceKey: string;
  props?: Record<string, any>;
  deep?: boolean; // Watch changes to object (not just creation).
  delay?: number;
};

export type SignalSubscription = {
  kind: string;
  dataType: string;
};

// TODO(burdon): Generalize binding.
// https://www.npmjs.com/package/aws-lambda
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
export type FunctionTrigger = {
  function: string;
  schedule?: string;
  subscriptions?: TriggerSubscription[];
  signals?: SignalSubscription[];
};

/**
 * Function manifest file.
 */
export type FunctionManifest = {
  functions: FunctionDef[];
  triggers: FunctionTrigger[];
};

export const FunctionResult = S.struct({
  type: S.string,
  value: S.any,
});
export type FunctionResult = S.Schema.Type<typeof FunctionResult>;
