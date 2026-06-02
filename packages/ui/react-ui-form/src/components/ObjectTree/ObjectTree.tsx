//
// Copyright 2026 DXOS.org
//

// A minimal, read-only schema-driven viewer. Walks an Effect Schema and a
// matching value and produces a flat list of indented key/value rows -- one
// per leaf field, with nested Struct fields contributing a header row plus
// recursively-indented children, and arrays expanded as `[index]` rows.
//
// Designed to drive a hierarchical editor over schemas produced by
// `@dxos/effect-proto` (e.g. the proto-generated `dxos.config.Config`
// schema), but works for any Effect Struct schema.

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type ReactElement, type ReactNode, type RefAttributes } from 'react';

import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

export type ObjectTreeProps<T> = {
  schema: Schema.Schema<T, any, never>;
  value: T;
};

/**
 * Render a value as a sequence of key/value rows whose shape and order are
 * driven by `schema`. Object-typed properties become a header row whose
 * children are indented under it; arrays expand element-by-element.
 *
 * Composable: spreads unknown props (incl. `className` / `classNames` /
 * `style` / `role`) onto its root `<div>` and forwards its ref, so it can
 * be slotted into themed parents like `Panel.Content`.
 */
const ObjectTreeImpl = composable<HTMLDivElement, ObjectTreeProps<any>>(({ schema, value, ...props }, forwardedRef) => (
  <div {...composableProps(props, { role: 'table', classNames: 'font-mono text-sm w-full' })} ref={forwardedRef}>
    <Node ast={schema.ast} value={value} label={null} depth={0} />
  </div>
));

ObjectTreeImpl.displayName = 'ObjectTree';

// `composable<HTMLDivElement, ObjectTreeProps<any>>` erases the `T` type
// parameter inside the factory; the cast restores the generic signature for
// consumers without changing the underlying component (the COMPOSABLE marker
// stays attached). This is the pattern documented on `composable()` itself.
export const ObjectTree = ObjectTreeImpl as unknown as <T>(
  props: ComposableProps<ObjectTreeProps<T>> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;

/**
 * Peel wrappers that don't affect the runtime shape: Refinements pass their
 * `from`, Suspends resolve via `f()`, and Transformations expose the encoded
 * (input) side. Repeated unwrapping handles chains like `Schema.suspend ->
 * Refinement -> TypeLiteral`.
 */
const unwrap = (ast: SchemaAST.AST): SchemaAST.AST => {
  if (SchemaAST.isRefinement(ast)) {
    return unwrap(ast.from);
  }
  if (SchemaAST.isSuspend(ast)) {
    return unwrap(ast.f());
  }
  if (SchemaAST.isTransformation(ast)) {
    return unwrap(ast.from);
  }
  return ast;
};

/**
 * Effect models `Schema.optional(X)` as a property whose type AST is
 * `Union(X, UndefinedKeyword)`. For walking purposes we want X -- the
 * undefined branch carries no schema information for the viewer.
 */
const stripOptional = (ast: SchemaAST.AST): SchemaAST.AST => {
  if (!SchemaAST.isUnion(ast)) {
    return ast;
  }
  const nonUndef = ast.types.filter((t) => !SchemaAST.isUndefinedKeyword(t));
  return nonUndef.length === 1 ? nonUndef[0] : ast;
};

type NodeProps = {
  ast: SchemaAST.AST;
  value: unknown;
  /** Row label; `null` means render children directly without a header row. */
  label: ReactNode | null;
  depth: number;
};

const Node = ({ ast, value, label, depth }: NodeProps) => {
  const inner = unwrap(stripOptional(ast));

  // Struct: header row + indented children. Skipping the header at depth 0
  // keeps the root flush-left.
  if (SchemaAST.isTypeLiteral(inner) && isPlainObject(value)) {
    const childDepth = label === null ? depth : depth + 1;
    return (
      <>
        {label !== null && <Row label={label} value={null} depth={depth} kind='group' />}
        {inner.propertySignatures.map((prop) => (
          <Node
            key={String(prop.name)}
            ast={prop.type}
            value={(value as Record<string, unknown>)[String(prop.name)]}
            label={String(prop.name)}
            depth={childDepth}
          />
        ))}
      </>
    );
  }

  // Array (`Schema.Array(X)` -> TupleType with single rest element).
  if (SchemaAST.isTupleType(inner) && Array.isArray(value)) {
    const elemType = inner.rest[0]?.type;
    return (
      <>
        {label !== null && <Row label={label} value={`Array(${value.length})`} depth={depth} kind='group' />}
        {value.map((item, index) => (
          <Node
            key={index}
            ast={elemType ?? SchemaAST.unknownKeyword}
            value={item}
            label={`[${index}]`}
            depth={depth + 1}
          />
        ))}
      </>
    );
  }

  // Leaf (scalars, unions of literals, unknown, etc.).
  return <Row label={label ?? ''} value={formatLeaf(value)} depth={depth} kind='leaf' />;
};

type RowProps = {
  label: ReactNode;
  value: ReactNode;
  depth: number;
  kind: 'group' | 'leaf';
};

const Row = ({ label, value, depth }: RowProps) => (
  <div role='row' className={mx('flex items-baseline gap-3 py-1')} style={{ paddingInlineStart: 8 + depth * 16 }}>
    <div role='cell' className='text-subdued'>
      {label}
    </div>
    <div role='cell' className={mx('break-all text-base-fg')}>
      {value}
    </div>
  </div>
);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Format a leaf value for display. Strings are quoted so empty strings are
 * visible; missing values surface as an em-dash so the row stays present.
 */
const formatLeaf = (value: unknown): ReactNode => {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return <span className='text-description'>null</span>;
  }

  switch (typeof value) {
    case 'string':
      // Quote strings so empty strings remain visible (`""` rather than blank).
      return <span className='text-blue-text'>{JSON.stringify(value)}</span>;
    case 'number':
    case 'bigint':
      return <span className='text-green-text'>{String(value)}</span>;
    case 'boolean':
      return <span className='text-purple-text'>{String(value)}</span>;
    default:
      // Objects we couldn't expand via schema (e.g. `google.protobuf.Any` -> Unknown)
      // are rendered as compact JSON.
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
  }
};
