//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Convert to protobuf.
// TODO(burdon): Reconcile with ECHO query API.
// TODO(burdon): Convert JSON query def to query object.

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
