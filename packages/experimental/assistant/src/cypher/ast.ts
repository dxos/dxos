//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Why interface not type?

export interface AstNode<Kind extends string> {
  astKind: Kind;
}

export interface Identifier extends AstNode<'Identifier'> {
  name: string;
}

export interface Property {
  key: Identifier;
  value: StringLiteral;
}

export interface Properties extends AstNode<'Properties'> {
  properties: Property[];
}

export interface NodePattern extends AstNode<'NodePattern'> {
  variable: Identifier | null;
  label: Identifier;
  properties: Properties | null;
}

export interface RelationshipPattern extends AstNode<'RelationshipPattern'> {
  variable: Identifier | null;
  label: Identifier;
  properties: Properties | null;
}

export interface GraphPatternConnector extends AstNode<'GraphPatternConnector'> {
  direction: '-' | '->' | '<-';
}

export interface GraphPattern extends AstNode<'GraphPattern'> {
  segments: (NodePattern | RelationshipPattern)[] & {
    separators: GraphPatternConnector[];
  };
}

export interface MatchClause extends AstNode<'MatchClause'> {
  pattern: GraphPattern;
}

export interface StringLiteral extends AstNode<'StringLiteral'> {
  value: string;
}

export interface MemberExpression extends AstNode<'MemberExpression'> {
  path: Identifier[];
}

export interface EqualsPredicate extends AstNode<'EqualsPredicate'> {
  left: MemberExpression;
  right: StringLiteral;
}

export interface WhereClause extends AstNode<'WhereClause'> {
  predicates: EqualsPredicate[];
}

export interface ReturnClause extends AstNode<'ReturnClause'> {
  fields: MemberExpression[];
}

export interface CypherQuery extends AstNode<'CypherQuery'> {
  matchClause: MatchClause;
  whereClause: WhereClause | null;
  returnClause: ReturnClause;
}
