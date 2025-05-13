//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DXN } from '@dxos/echo-schema';

export const Predicate = Schema.Union(
  Schema.Struct({
    type: Schema.Literal('eq'),
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('neq'),
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('gt'),
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('gte'),
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('lt'),
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('lte'),
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('in'),
    values: Schema.Array(Schema.Any),
  }),
  Schema.Struct({
    type: Schema.Literal('range'),
    from: Schema.Any,
    to: Schema.Any,
  }),
);

export type Predicate = Schema.Schema.Type<typeof Predicate>;

export const PredicateSet = Schema.Record({
  key: Schema.String.annotations({ description: 'Property name' }),
  value: Predicate,
});

export type PredicateSet = Schema.Schema.Type<typeof PredicateSet>;

/**
 * Query objects by type, id, and/or predicates.
 */
const ASTTypeClause_ = Schema.Struct({
  type: Schema.Literal('type'),
  typename: Schema.optional(DXN),
  id: Schema.optional(Schema.String),
  predicates: Schema.optional(PredicateSet),
});
interface ASTTypeClause extends Schema.Schema.Type<typeof ASTTypeClause_> {}
const ASTTypeClause: Schema.Schema<ASTTypeClause> = ASTTypeClause_;

/**
 * Traverse references from an anchor object.
 */
const ASTReferenceTraversalClause_ = Schema.Struct({
  type: Schema.Literal('reference-traversal'),
  anchor: Schema.suspend((): Schema.Schema<AST> => AST),
  property: Schema.String,
});
interface ASTReferenceTraversalClause extends Schema.Schema.Type<typeof ASTReferenceTraversalClause_> {}
const ASTReferenceTraversalClause: Schema.Schema<ASTReferenceTraversalClause> = ASTReferenceTraversalClause_;

/**
 * Traverse incoming references to an anchor object.
 */
const ASTIncomingReferencesClause_ = Schema.Struct({
  type: Schema.Literal('incoming-references'),
  anchor: Schema.suspend((): Schema.Schema<AST> => AST),
  property: Schema.String,
  typename: Schema.optional(DXN),
});
interface ASTIncomingReferencesClause extends Schema.Schema.Type<typeof ASTIncomingReferencesClause_> {}
const ASTIncomingReferencesClause: Schema.Schema<ASTIncomingReferencesClause> = ASTIncomingReferencesClause_;

/**
 * Traverse relations connecting to an anchor object.
 */
const ASTRelationClause_ = Schema.Struct({
  type: Schema.Literal('relation'),
  anchor: Schema.suspend((): Schema.Schema<AST> => AST),
  direction: Schema.Literal('outgoing', 'incoming', 'both'),
  typename: Schema.optional(DXN),
  predicates: Schema.optional(PredicateSet),
});
interface ASTRelationClause extends Schema.Schema.Type<typeof ASTRelationClause_> {}
const ASTRelationClause: Schema.Schema<ASTRelationClause> = ASTRelationClause_;

/**
 * Traverse into the source or target of a relation.
 */
const ASTRelationTraversalClause_ = Schema.Struct({
  type: Schema.Literal('relation-traversal'),
  anchor: Schema.suspend((): Schema.Schema<AST> => AST),
  direction: Schema.Literal('source', 'target', 'both'),
});
interface ASTRelationTraversalClause extends Schema.Schema.Type<typeof ASTRelationTraversalClause_> {}
const ASTRelationTraversalClause: Schema.Schema<ASTRelationTraversalClause> = ASTRelationTraversalClause_;

/**
 * Union of multiple queries.
 */
const ASTUnionClause_ = Schema.Struct({
  type: Schema.Literal('union'),
  queries: Schema.Array(Schema.suspend((): Schema.Schema<AST> => AST)),
});
interface ASTUnionClause extends Schema.Schema.Type<typeof ASTUnionClause_> {}
const ASTUnionClause: Schema.Schema<ASTUnionClause> = ASTUnionClause_;

const AST_ = Schema.Union(
  ASTTypeClause,
  ASTReferenceTraversalClause,
  ASTIncomingReferencesClause,
  ASTRelationClause,
  ASTRelationTraversalClause,
  ASTUnionClause,
);

export type AST = Schema.Schema.Type<typeof AST_>;
export const AST: Schema.Schema<AST> = AST_;
