//
// Copyright 2023 DXOS.org
//

export type FunctionDef = {
  // FQ function name.
  id: string;
  // HTTP endpoint.
  endpoint: string;
  // Path of handler.
  handler: string;
  description?: string;
};

export type TriggerSubscription = {
  type: string;
  spaceKey: string;
  props?: Record<string, any>;
  nested?: string[];
};

// TODO(burdon): Generalize binding.
// https://www.npmjs.com/package/aws-lambda
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
export type FunctionTrigger = {
  function: string;
  subscription: TriggerSubscription;
};

/**
 * Function manifest file.
 */
export type FunctionManifest = {
  functions: FunctionDef[];
  triggers: FunctionTrigger[];
};
