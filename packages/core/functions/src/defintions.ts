//
// Copyright 2023 DXOS.org
//

export type FunctionsManifest = {
  functions: Record<string, FunctionConfig>;
  triggers: FunctionTrigger[];
};

export type FunctionConfig = {
  description?: string;
};

export type FunctionTrigger = {
  function: string;
  subscription: TriggerSubscription;
};

export type TriggerSubscription = {
  type: string;
  spaceKey: string;
  props?: Record<string, any>;
  nested?: string[];
};
