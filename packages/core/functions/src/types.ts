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

// TODO(burdon): Effect schema.
// https://www.npmjs.com/package/aws-lambda
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
export type FunctionTrigger = {
  function: string;

  timer?: TimerTrigger;
  webhook?: WebhookTrigger;
  websocket?: WebsocketTrigger;
  subscription?: SubscriptionTrigger;
};

export type TimerTrigger = {
  cron: string;
};

// TODO(burdon): Auth header.
export type WebhookTrigger = {
  port: number;
};

// TODO(burdon): Auth header.
export type WebsocketTrigger = {
  url: string;
};

export type SubscriptionTrigger = {
  spaceKey: string;
  // TODO(burdon): Query DSL.
  filter: {
    type: string;
    props?: Record<string, any>;
  }[];
  options?: {
    // Watch changes to object (not just creation).
    deep?: boolean;
    // Debounce changes (delay in ms).
    delay?: number;
  };
};

/**
 * Function manifest file.
 */
export type FunctionManifest = {
  functions: FunctionDef[];
  triggers: FunctionTrigger[];
};
