//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Convert to protobuf.

export enum Op {
  EQ = 0,
  NE = 1,
  IN = 2,
}

export type Filter = {
  op?: Op;
  type?: string;
  key?: string;
  value?: any;
};

export enum Bool {
  NOT = 0,
  AND = 1,
  OR = 2,
}

export type Predicate = {
  op?: Bool;
  predicates?: Predicate[];
  filter?: Filter;
};

export type Query = {
  root: Predicate;
};
