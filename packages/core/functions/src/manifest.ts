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

export type TriggerSubscription = {
  type: string;
  spaceKey: string;
  props?: Record<string, any>;
  nested?: string[];
  delay?: number;
};

// TODO(burdon): Generalize binding.
// https://www.npmjs.com/package/aws-lambda
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
export type FunctionTrigger = {
  function: string;
  schedule?: string;
  subscription?: TriggerSubscription;
};

/**
 * Function manifest file.
 */
export type FunctionManifest = {
  functions: FunctionDef[];
  triggers: FunctionTrigger[];
};
