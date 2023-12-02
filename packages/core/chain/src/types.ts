//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Agent/plan-and-execute (with tools). Create design doc/ontology of sequence/agent.

export type Variable = {
  name: string;
  type: 'value' | 'function' | 'query' | 'retriever' | 'pass-through';
};

export type Step = {
  id: string;
};

export type Prompt = Step & {
  title?: string;
  description?: string;
  template: string;
  variables: Variable[];
};

export type Sequence = Step & {
  runnable: Step[];
};

export type Chain = {};
