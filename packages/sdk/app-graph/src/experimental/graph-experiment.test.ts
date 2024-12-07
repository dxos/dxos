import { AST, Schema } from '@effect/schema';
import type { DXN } from '@dxos/keys';
import { Any } from '@effect/schema/Schema';

/*

TODO:

- Where clause
- References
- NodeDef<S extends Schema.AllNoContext>

*/

//
// Generic utils
//
type Simplify<T> = { [K in keyof T]: T[K] } & {};

type Flatten<T extends readonly any[]> = T extends [infer Head, ...infer Tail]
  ? Head extends readonly any[]
    ? [...Head, ...Flatten<Tail>]
    : [Head, ...Flatten<Tail>]
  : [];

//
// Schema Definition Language
//

// Node

export const NodeTypeId: unique symbol = Symbol.for('@dxos/app-graph/Node');

export type NodeDef<T> = {
  [NodeTypeId]: {
    _T: T;
  };
  identifier: string;
  schema: Schema.Schema<T, any, never>;
};

const nodeDefVariance: NodeDef.Any[typeof NodeTypeId] = { _T: null };

export const NodeDef = <S extends Schema.Schema.AnyNoContext>(
  identifier: string,
  schema: S,
): NodeDef<Schema.Schema.Type<S>> => ({
  [NodeTypeId]: nodeDefVariance,
  identifier,
  schema,
});

declare namespace NodeDef {
  type Data<T extends NodeDef.Any> = T extends NodeDef<infer U> ? U : never;

  type Any = NodeDef<any>;
}

export type Node<T> = {
  id: string;
  kind: 'node';
  type: string;

  // TODO(dmaretskyi): Top level.
  data: T;
};

// Relation

export const RelationTypeId: unique symbol = Symbol.for('@dxos/app-graph/Relation');

export type RelationDef<T> = {
  [RelationTypeId]: {
    _T: T;
  };
  identifier: string;
  schema: Schema.Schema<T, any, never>;
};

const relationDefVariance: RelationDef.Any[typeof RelationTypeId] = { _T: null };

export const RelationDef = <S extends Schema.Schema.AnyNoContext>(
  identifier: string,
  schema: S,
): RelationDef<Schema.Schema.Type<S>> => ({
  [RelationTypeId]: relationDefVariance,
  identifier,
  schema,
});

declare namespace RelationDef {
  type Data<T extends RelationDef.Any> = T extends RelationDef<infer U> ? U : never;

  type Any = RelationDef<any>;
}

export type Relation<T> = {
  id: string;
  kind: 'relation';
  type: string;

  // TODO(dmaretskyi): Top level.
  data: T;
};

/**
 * Reference to a node.
 */
interface Ref<N extends NodeDef.Any> {
  dxn: DXN;

  readonly target: Node<NodeDef.Data<N>> | undefined;
}

declare namespace Ref {
  export type Any = Ref<any>;

  export type TargetNode<R extends Ref.Any> = R extends Ref<infer N> ? N : never;
}

/**
 * Reference that has been resolved.
 */
interface ResolvedRef<N extends NodeDef.Any> extends Ref<N> {
  readonly target: Node<NodeDef.Data<N>>;
}

interface Ref$<N extends NodeDef.Any> extends Schema.Schema<Ref<N>> {}

const Ref = <N extends NodeDef.Any>(target: N): Ref$<N> => Schema.make(AST.anyKeyword);

//
// Query Language
//

// General

export const LValueTypeId: unique symbol = Symbol.for('@dxos/app-graph/PropPattern');

/**
 * LValue (from compiler terminology) is an expression that can appear on the left-hand side of an assignment operator.
 */
interface LValue<T> {
  [LValueTypeId]: {
    _T: T;
  };

  target(this: LValue<Ref.Any>): T extends Ref.Any ? NodePattern<Ref.TargetNode<T>> : never;
}

declare namespace LValue {
  type Any = LValue<any>;

  type Type<T extends LValue.Any> = T extends LValue<infer U> ? U : never;
}

type DataSelector<T> = { [K in keyof T]?: true };

type SelectData<T, D extends DataSelector<T>> = Pick<T, keyof D & keyof T>;

// TODO(dmaretskyi): Nested paths.
type PathOf<T> = keyof T;

type PickProp<T, P extends PathOf<T>> = T[P];

interface PropSelectable<T> {
  prop<P extends PathOf<T>>(path: P): LValue<PickProp<T, P>>;
}

type PropertyFilter<T> = Partial<T>;

// Match

type PatternInput = NodeDef.Any | (NodeDef.Any | RelationDef.Any)[];

/**
 * Pattern of 1 node or multiple nodes connected by relations.
 *
 * Cypher: `(a:Node)-[RELATION]->(b:Node)`
 */
interface Pattern<P extends PatternInput> {
  related<R extends RelationDef.Any>(
    relation: RelationPattern<R>,
    opts?: { direction: 'left' | 'right' | 'undirected' },
  ): UnfinishedPattern<P, R>;
}

/**
 * Cypher: `(n:Node)-[RELATION]->_`
 */
interface UnfinishedPattern<P extends PatternInput, R extends RelationDef.Any> {
  to<N extends NodeDef.Any>(node: NodePattern<N>): Pattern<ConcatPatterns<P, R, N>>;
}

export const NodePatternTypeId: unique symbol = Symbol.for('@dxos/app-graph/NodePattern');

/**
 * Pattern of one node exactly.
 * Distinct from "1 or more" node pattern so that you can apply `where` clauses.
 *
 * Cypher: `(n:Node)`
 */
interface NodePattern<N extends NodeDef.Any>
  extends Pattern<N>,
    LValue<Node<NodeDef.Data<N>>>,
    PropSelectable<NodeDef.Data<N>> {
  [NodePatternTypeId]: {
    _N: N;
  };

  where(filter: PropertyFilter<NodeDef.Data<N>>): NodePattern<N>;
}

declare namespace NodePattern {
  type Data<NP extends NodePattern<any>> = NP extends NodePattern<infer N> ? NodeDef.Data<N> : unknown;

  type Any = NodePattern<any>;
}

export const RelationPatternTypeId: unique symbol = Symbol.for('@dxos/app-graph/RelationPattern');

/**
 * Cypher: `[r:RELATION]`
 */
interface RelationPattern<R extends RelationDef.Any>
  extends LValue<Relation<RelationDef.Data<R>>>,
    PropSelectable<RelationDef.Data<R>> {
  [RelationPatternTypeId]: {
    _R: R;
  };

  where(filter: PropertyFilter<RelationDef.Data<R>>): RelationPattern<R>;
}

declare namespace RelationPattern {
  type Data<NP extends RelationPattern<any>> = NP extends RelationPattern<infer N> ? RelationDef.Data<N> : unknown;

  type Any = RelationPattern<any>;
}

interface MatchClause<PS extends PatternInput[]> {
  or<PS1 extends Pattern<any>[]>(...patterns: PS1): MatchClause<PS | MatchClauseOutput<PS1>>;

  where(filters: never): WhereClause<PS>;

  return(): CompleteQuery<Simplify<ReturnSpecFromPatterns<PS>>>;
  return<R extends AnyReturnSpec>(returnSpec: R): CompleteQuery<Simplify<ReturnSpecType<R>>>;
}

type MatchClauseOutput<P extends Pattern<any>[]> = { [K in keyof P]: P[K] extends Pattern<infer PI> ? PI : never };

type ConcatPatterns<P extends PatternInput, R extends RelationDef.Any, N extends NodeDef.Any> = P extends NodeDef.Any
  ? [P, R, N]
  : P extends [...infer Elements]
    ? [...Elements, R, N]
    : never;

// Where

interface WhereClause<PS extends PatternInput[]> {
  return(): CompleteQuery<Simplify<ReturnSpecFromPatterns<PS>>>;
  return<R extends AnyReturnSpec>(returnSpec: R): CompleteQuery<Simplify<ReturnSpecType<R>>>;
}

// Return

type ReturnSpecFromPattern<P extends PatternInput> =
  P extends NodeDef<infer T>
    ? Node<T>
    : P extends any[]
      ? {
          [K in keyof P]: P[K] extends NodeDef<infer T>
            ? Node<T>
            : P[K] extends RelationDef<infer T>
              ? Relation<T>
              : unknown;
        }
      : unknown;

export type ReturnSpecFromPatterns<PS extends PatternInput[]> = PS extends any[]
  ? {
      [K in keyof PS]: ReturnSpecFromPattern<PS[K]>;
    }
  : unknown;

type AnyReturnSpec = Record<string, LValue<any>>;

type ReturnSpecType<R extends AnyReturnSpec> = {
  [K in keyof R]: R[K] extends LValue<infer T> ? T : unknown;
};

// Query builder

interface CompleteQuery<R> {}

declare namespace CompleteQuery {
  export type Any = CompleteQuery<any>;

  export type Result<Q extends CompleteQuery<any>> = Q extends CompleteQuery<infer R> ? R : unknown;
}

interface QueryBuilder {
  Node<N extends NodeDef.Any>(def: N): NodePattern<N>;
  Relation<R extends RelationDef.Any>(def: R): RelationPattern<R>;

  /**
   * All patterns must match at the same time.
   */
  Match<PS extends Pattern<any>[]>(...patterns: PS): MatchClause<MatchClauseOutput<PS>>;

  // Prop<NP extends NodePattern.Any>(node: NP): PropPattern<Node<NodePattern.Data<NP>>>;
  // Return<NP extends NodePattern.Any, D extends DataSelector<NodePattern.Data<NP>>>(
  //   node: NP,
  //   selector: D,
  // ): ReturnSpecEntry<Node<SelectData<NodePattern.Data<NP>, D>>>;
  // Prop<NP extends NodePattern.Any, P extends PathOf<NodePattern.Data<NP>>>(
  //   node: NP,
  //   path: P,
  // ): PropPattern<PickProp<NodePattern.Data<NP>, P>>;

  // Return<N extends RelationDef.Any>(relation: RelationPattern<N>): ReturnSpecEntry<Relation<RelationDef.Data<N>>>;
  // Return<N extends RelationDef.Any, D extends DataSelector<RelationDef.Data<N>>>(
  //   relation: RelationPattern<N>,
  //   selector: D,
  // ): ReturnSpecEntry<Relation<SelectData<RelationDef.Data<N>, D>>>;
  // Return<N extends RelationDef.Any, P extends PathOf<RelationDef.Data<N>>>(
  //   relation: RelationPattern<N>,
  //   path: P,
  // ): ReturnSpecEntry<PickField<RelationDef.Data<N>, P>>;

  build<Q extends CompleteQuery<any>>(builderFn: () => Q): Q;
}

//
// Example schema
//

const ContactSchema = Schema.Struct({
  name: Schema.String,
});

const ContactNode = NodeDef('Contact', ContactSchema);

const DocumentSchema = Schema.Struct({
  name: Schema.String,
  kind: Schema.Literal('text', 'diagram'),
  content: Schema.String,
  author: Ref(ContactNode),
}).pipe(Schema.mutable);

const DocumentNode = NodeDef('Document', DocumentSchema);

const ActionSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  // TODO(dmaretskyi): Parameters.
});

const ActionNode = NodeDef('Action', ActionSchema);

const ActionForNodeSchema = Schema.Struct({});

const ActionForNodeRelation = RelationDef('ActionForNode', ActionForNodeSchema);

// TODO(dmaretskyi): Example for testing, actual impl will have subscriptions.
const runQuery = <Q extends CompleteQuery.Any>(query: Q): Simplify<CompleteQuery.Result<Q>> => {
  return null as any;
};

//
// Example query
//

declare const QB: QueryBuilder;

const getAllTextDocuments = QB.Match(QB.Node(DocumentNode).where({ kind: 'text' })).return();

const getAllActionsForAllDocuments = QB.Match(
  QB.Node(DocumentNode).related(QB.Relation(ActionForNodeRelation)).to(QB.Node(ActionNode)),
).return();

const getAllDocumentsMetadata = QB.build(() => {
  const document = QB.Node(DocumentNode);

  return QB.Match(document).return({
    name: document.prop('name'),
    content: document.prop('content'),
  });
});

const getAllDocumentNamesAndTheirAuthorsAndTheirActions = QB.build(() => {
  const document = QB.Node(DocumentNode);
  const action = QB.Node(ActionNode);

  return QB.Match(document.related(QB.Relation(ActionForNodeRelation)).to(action)).return({
    name: document.prop('name'),
    content: document.prop('content'),
    authorName: document.prop('author').target().prop('name'),
    action: action,
  });
});
