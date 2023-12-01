//
// Copyright 2023 DXOS.org
//

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

// TODO(burdon): Generalize binding.
// https://www.npmjs.com/package/aws-lambda
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
export type FunctionTrigger = {
  function: string;
  schedule?: string;
  subscriptions?: TriggerSubscription[];
};

/**
 * Function manifest file.
 */
export type FunctionManifest = {
  functions: FunctionDef[];
  triggers: FunctionTrigger[];
};
