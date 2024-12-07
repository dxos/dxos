import { AST, Schema } from '@effect/schema';
import type { DXN } from '@dxos/keys';
import { Any } from '@effect/schema/Schema';

/*

TODO:

- More flexible return types, so that return isn't limited to being an object


- Do we need a separate syntax to express patterns with refs (so that we can utilize the reverse reference index) or are predicates ok?
e.g can we infer the scan order from the query:
> MATCH (d:Document) WHERE d.author.id == $authorId RETURN DISTINCT document.author AS author

Expected plan:
> ScanNodeById(c:Contact, { id: $authorId })
> ReverseReferenceScan(d, d.author == c)
> TypeFilter(d typeof Document)
> Map({ author: document.author })
> Distinct(author)

*/

type Id = string & { __Id: never };

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

export type NodeDef<Ident extends string, T> = {
  [NodeTypeId]: {
    _Ident: Ident;
    _T: T;
  };
  identifier: string;
  schema: Schema.Schema<T, any, never>;
};

const nodeDefVariance: NodeDef.Any[typeof NodeTypeId] = { _Ident: '', _T: null };

export const NodeDef = <Ident extends string, S extends Schema.Schema.AnyNoContext>(
  identifier: Ident,
  schema: S,
): NodeDef<Ident, Schema.Schema.Type<S>> => ({
  [NodeTypeId]: nodeDefVariance as any,
  identifier,
  schema,
});

declare namespace NodeDef {
  type Any = NodeDef<string, any>;

  type Properties<T extends NodeDef.Any> = T extends NodeDef<string, infer U> ? U : never;

  type NodeType<N extends NodeDef.Any> = Node<NodeDef.Properties<N>>;
}

// TODO(dmaretskyi): Take node def as parameter?
export type Node<T> = {
  id: Id;
  kind: 'node';
  type: string;

  // TODO(dmaretskyi): Top level?
  data: T;
};

// Relation

export const RelationTypeId: unique symbol = Symbol.for('@dxos/app-graph/Relation');

export type RelationDef<Ident extends string, T> = {
  [RelationTypeId]: {
    _Ident: Ident;
    _T: T;
  };
  identifier: string;
  schema: Schema.Schema<T, any, never>;
};

const relationDefVariance: RelationDef.Any[typeof RelationTypeId] = { _Ident: '', _T: null };

export const RelationDef = <Ident extends string, S extends Schema.Schema.AnyNoContext>(
  identifier: Ident,
  schema: S,
): RelationDef<Ident, Schema.Schema.Type<S>> => ({
  [RelationTypeId]: relationDefVariance as any,
  identifier,
  schema,
});

declare namespace RelationDef {
  type Any = RelationDef<string, any>;

  type Properties<T extends RelationDef.Any> = T extends RelationDef<string, infer U> ? U : never;

  type RelationType<R extends RelationDef.Any> = Node<RelationDef.Properties<R>>;
}

export type Relation<T> = {
  id: Id;
  kind: 'relation';
  type: string;

  // TODO(dmaretskyi): Top level?
  data: T;
};

/**
 * Reference to a node.
 */
interface Ref<N extends NodeDef.Any> {
  dxn: DXN;

  readonly target: Node<NodeDef.Properties<N>> | undefined;
}

declare namespace Ref {
  export type Any = Ref<any>;

  export type TargetNode<R extends Ref.Any> = R extends Ref<infer N> ? N : never;
}

/**
 * Reference that has been resolved.
 */
interface ResolvedRef<N extends NodeDef.Any> extends Ref<N> {
  readonly target: Node<NodeDef.Properties<N>>;
}

interface Ref$<N extends NodeDef.Any> extends Schema.Schema<Ref<N>> {}

const Ref = <N extends NodeDef.Any>(target: N): Ref$<N> => Schema.make(AST.anyKeyword);

//
// Query Language
//

// General

export const RValueTypeId: unique symbol = Symbol.for('@dxos/app-graph/RValue');

/**
 * RValue (from compiler terminology) is an expression that can appear on the right-hand side of an assignment operator.
 */
interface RValue<T> {
  [RValueTypeId]: {
    _T: T;
  };

  eq(other: RValue<T>): RValue<boolean>;
  neq(other: RValue<T>): RValue<boolean>;

  gt(this: RValue<number>, other: RValue<number>): RValue<boolean>;
  gte(this: RValue<number>, other: RValue<number>): RValue<boolean>;
  lt(this: RValue<number>, other: RValue<number>): RValue<boolean>;
  lte(this: RValue<number>, other: RValue<number>): RValue<boolean>;

  and(this: RValue<boolean>, other: RValue<boolean>): RValue<boolean>;
  or(this: RValue<boolean>, other: RValue<boolean>): RValue<boolean>;
}

declare namespace RValue {
  type Any = RValue<any>;

  type Type<T extends RValue.Any> = T extends RValue<infer U> ? U : never;
}

export const LValueTypeId: unique symbol = Symbol.for('@dxos/app-graph/LValue');

/**
 * LValue (from compiler terminology) is an expression that can appear on the left-hand side of an assignment operator.
 */
interface LValue<T> extends RValue<T> {
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
    LValue<Node<NodeDef.Properties<N>>>,
    PropSelectable<NodeDef.Properties<N>> {
  [NodePatternTypeId]: {
    _N: N;
  };

  id(): RValue<Id>;

  where(filter: PropertyFilter<NodeDef.Properties<N>>): NodePattern<N>;
}

declare namespace NodePattern {
  type Data<NP extends NodePattern<any>> = NP extends NodePattern<infer N> ? NodeDef.Properties<N> : unknown;

  type Any = NodePattern<any>;
}

export const RelationPatternTypeId: unique symbol = Symbol.for('@dxos/app-graph/RelationPattern');

/**
 * Cypher: `[r:RELATION]`
 */
interface RelationPattern<R extends RelationDef.Any>
  extends LValue<Relation<RelationDef.Properties<R>>>,
    PropSelectable<RelationDef.Properties<R>> {
  [RelationPatternTypeId]: {
    _R: R;
  };

  id(): RValue<Id>;

  where(filter: PropertyFilter<RelationDef.Properties<R>>): RelationPattern<R>;
}

declare namespace RelationPattern {
  type Data<NP extends RelationPattern<any>> =
    NP extends RelationPattern<infer N> ? RelationDef.Properties<N> : unknown;

  type Any = RelationPattern<any>;
}

interface MatchClause<PS extends PatternInput[]> {
  or<PS1 extends Pattern<any>[]>(...patterns: PS1): MatchClause<PS | MatchClauseOutput<PS1>>;

  where(filter: RValue<boolean>): WhereClause<PS>;

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
  where(filter: RValue<boolean>): WhereClause<PS>;

  return(): CompleteQuery<Simplify<ReturnSpecFromPatterns<PS>>>;
  return<R extends AnyReturnSpec>(returnSpec: R): CompleteQuery<Simplify<ReturnSpecType<R>>>;
}

// Return

type ReturnSpecFromPattern<P extends PatternInput> = P extends NodeDef.Any
  ? Node<NodeDef.Properties<P>>
  : P extends any[]
    ? {
        [K in keyof P]: P[K] extends NodeDef.Any
          ? NodeDef.NodeType<P[K]>
          : P[K] extends RelationDef.Any
            ? RelationDef.RelationType<P[K]>
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

type AnyQueryResult = Record<string, any>;

type OrderDirection = 'ASC' | 'DESC';

interface CompleteQuery<R extends AnyQueryResult> {
  distinctBy<PS extends PathOf<R>[]>(...props: PS): CompleteQuery<R>;

  orderBy<PS extends PathOf<R>[]>(...props: { [K in keyof PS]: [PS[K], OrderDirection] }): CompleteQuery<R>;

  limit(rows: number): CompleteQuery<R>;
  // TODO(dmaretskyi): Research different paging methods.
  skip(rows: number): CompleteQuery<R>;
}

declare namespace CompleteQuery {
  export type Any = CompleteQuery<any>;

  export type Result<Q extends CompleteQuery<any>> = Q extends CompleteQuery<infer R> ? R : unknown;
}

interface QueryBuilder {
  //
  // Patterns
  //
  Node<N extends NodeDef.Any>(def: N): NodePattern<N>;
  Relation<R extends RelationDef.Any>(def: R): RelationPattern<R>;

  //
  // Expressions
  //

  literal<T>(value: T): RValue<T>;

  not(value: RValue<boolean>): RValue<boolean>;
  and(...values: RValue<boolean>[]): RValue<boolean>;
  or(...values: RValue<boolean>[]): RValue<boolean>;

  //
  // Clauses
  //

  /**
   * All patterns must match at the same time.
   */
  Match<PS extends Pattern<any>[]>(...patterns: PS): MatchClause<MatchClauseOutput<PS>>;

  /**
   * Helper to define scoped parameters.
   */
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
// Example queries
//

declare const QB: QueryBuilder;

// MATCH (Document { kind: 'text' })
const getAllTextDocuments = QB.Match(QB.Node(DocumentNode).where({ kind: 'text' })).return();

// MATCH (Document)-[ACTION_FOR_NODE]->(Action)
const getAllActionsForAllDocuments = QB.Match(
  QB.Node(DocumentNode).related(QB.Relation(ActionForNodeRelation)).to(QB.Node(ActionNode)),
).return();

// MATCH (d:Document) RETURN d.name AS name, d.kind AS kind
const getAllDocumentsMetadata = QB.build(() => {
  const document = QB.Node(DocumentNode);

  return QB.Match(document).return({
    name: document.prop('name'),
    kind: document.prop('kind'),
  });
});

// MATCH (d:Document)-[ACTION_FOR_NODE]->(a:Action) RETURN d.name AS name, d.content AS content, d.author.name AS authorName, a AS action ORDER BY authorName DESC, name ASC LIMIT 100
const getAllDocumentNamesAndTheirAuthorsAndTheirActions = QB.build(() => {
  const document = QB.Node(DocumentNode);
  const action = QB.Node(ActionNode);

  return QB.Match(document.related(QB.Relation(ActionForNodeRelation)).to(action))
    .return({
      name: document.prop('name'),
      content: document.prop('content'),
      authorName: document.prop('author').target().prop('name'),
      action: action,
    })
    .orderBy(['authorName', 'DESC'], ['name', 'ASC'])
    .limit(100);
});

// MATCH (d:Document) RETURN DISTINCT document.author AS author
const allContactsThatHaveAuthoredDocuments = QB.build(() => {
  const document = QB.Node(DocumentNode);

  return QB.Match(document)
    .return({
      author: document.prop('author').target(),
    })
    .distinctBy('author');
});

// MATCH (d:Document) WHERE d.author.id == $authorId RETURN DISTINCT document.author AS author
const allDocumentsByThisAuthor = (authorId: Id) =>
  QB.build(() => {
    const document = QB.Node(DocumentNode);
    const author = document.prop('author').target();

    return QB.Match(document)
      .where(author.id().eq(QB.literal(authorId)))
      .return({
        author,
      })
      .distinctBy('author');
  });
