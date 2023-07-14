//
// Copyright 2023 DXOS.org
//

export type FunctionsManifest = {
  functions: Record<string, FunctionConfig>;
};

export type FunctionConfig = {
  description?: string;
};

export type FunctionTriggers = {
  function: string;
  triggers: FunctionTrigger[];
};

export type FunctionTrigger = {
  type: string;
  spaceKey: string;
  subscription: {
    props?: Record<string, any>;
    nested?: string[];
  };
};
