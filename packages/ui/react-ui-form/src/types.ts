//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import type * as SchemaAST from 'effect/SchemaAST';
import { type FC, type FocusEvent, type ReactElement } from 'react';

import { type Database, type Entity, type Format, type Obj, type Type } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { type Palette } from '@dxos/react-ui';
import { type ProjectionModel } from '@dxos/schema';

//
// Field component contracts.
//

/**
 * Validation status of a field.
 */
export type FormFieldStatus = {
  status?: 'error';
  error?: string;
};

/**
 * FormPresentation mode.
 * - full: Show label, control, and status.
 * - compact: Show label and control.
 * - inline: Control only.
 * - static: Plain DOM; omit all undefined values.
 */
export type FormPresentation = 'full' | 'compact' | 'inline' | 'static';

/**
 * Dynamic props passed to input components.
 */
export type FormFieldStateProps<T = any> = {
  getStatus: () => FormFieldStatus;
  getValue: () => T | undefined;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onValueChange: (type: SchemaAST.AST, value: T) => void;
};

/**
 * Props passed to input components.
 */
export type FormFieldRendererProps<T = any> = {
  /** Database the form is editing against; populated for fields whose value is an ECHO object/Ref. */
  db?: Database.Database;
  type: SchemaAST.AST;
  format?: Format.TypeFormat;
  readonly?: boolean;
  label: string;
  /**
   * Human-readable description (from the schema's description annotation). Rendered as visible text
   * only when the resolved presentation opts in; otherwise it falls back to the input placeholder.
   */
  description?: string;
  /**
   * Dotted JSON path of this field within the form values (e.g. `runtime.client.storage.persistent`).
   */
  jsonPath?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Presentation mode for the field (full/compact/inline/static); see {@link FormPresentation}. */
  presentation?: FormPresentation;
  /** Whether the field is required (non-optional in the schema); surfaces a trailing asterisk on the label. */
  required?: boolean;
} & FormFieldStateProps<T>;

export type FormFieldRenderer = FC<FormFieldRendererProps>;

export type FormFieldMap = Record<string, FormFieldRenderer>;

export type FormFieldProvider = (props: {
  prop: string;
  schema: Schema.Schema<any>;
  fieldProps: FormFieldRendererProps;
}) => ReactElement | null | undefined;

//
// Ref / create contracts.
//

/**
 * Per-typename override for the ref-field inline create form and its submission handler.
 * The type parameter S links the form schema's decoded type to the createObject values argument,
 * ensuring the schema and the handler agree on the shape of the form data.
 */
export type CreateEntryOverride<S extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext> = {
  /** Replaces the raw ECHO type schema for the inline create form. */
  inputSchema?: S;
  /** Runs instead of the default onCreate(schema, values) path; values are typed from inputSchema. */
  createObject?: (values: Schema.Schema.Type<S>, db: Database.Database) => Promise<Obj.Unknown>;
};

/**
 * Configuration for the inline "create a new referenced object" affordance, shared by every
 * surface that can spawn a ref target (the picker, `RefField`, and the `Form*` props that forward
 * to them). `onCreate` is intentionally NOT part of this group: its signature differs per consumer
 * (the picker takes `(values)`, `RefField` takes `(schema, values)`).
 */
export type CreateOptions = {
  createOptionLabel?: [string, { ns: string | readonly string[] }];
  createOptionIcon?: string;
  createInitialValuePath?: string;
  createFieldMap?: FormFieldMap;
};

export type RefOption = {
  id: string;
  label: string;
  /** Optional secondary line shown beneath the label in the picker list. */
  description?: string;
  hue?: Palette;
};

/**
 * Data plumbing for resolving and creating ref targets: how to look up the ref type, query
 * candidate objects, map them to options, and persist a newly-created one.
 */
export type RefFieldDataProps = {
  // TODO(burdon): Replace hooks with callbacks?
  useType?: (db?: Database.Database, typeUri?: URI.URI) => Type.AnyEntity;
  useResults?: (db?: Database.Database, typename?: string) => Entity.Any[];
  getOptions?: (
    objects: Entity.Any[],
    options?: { parentLabel?: boolean; getTypePlaceholder?: (typename: string) => string },
  ) => RefOption[];
  /**
   * Persist a newly-created object. Called after the user fills out the inline create form and
   * clicks Save. Should add the object to the database and return it (sync or async). The returned
   * object is then wired into this slot's form value as a Ref.
   */
  onCreate?: (schema: Type.AnyEntity, values: any) => Obj.Unknown | Promise<Obj.Unknown> | undefined | void;
  /**
   * Supply default values for a newly-created owned object when the user clicks "add" on an owned-ref
   * array field (see `FormCreateAnnotation`). Keyed by the field's json path so a container can pre-populate
   * the new object (e.g. a back-reference to the parent). The returned values are passed to
   * `onCreate(schema, values)` before the object is persisted.
   */
  getCreateDefaults?: (props: { jsonPath: string; schema: Type.AnyEntity }) => Record<string, unknown> | undefined;
  /**
   * Optional resolver that maps a ref's typename to a {@link CreateEntryOverride}, replacing the
   * raw ECHO type schema and/or the default `onCreate` path with plugin-registered create logic
   * (e.g. `SpaceCapabilities.CreateObjectEntry`). When absent or returning `undefined` for a given
   * typename the existing fallback behaviour is preserved.
   */
  resolveCreateEntry?: (typename: string) => CreateEntryOverride | undefined;
};

/**
 * Form-wide field options carried by the form context and threaded down to every field. The
 * canonical source for the config that `FormContextValue`, `FormFieldProps`, and `FormFieldSetProps`
 * all share — so none of them has to reach "up" into another's props to express it.
 */
export type FormFieldOptions = {
  db?: Database.Database;
  readonly?: boolean;
  /**
   * When `readonly`, omit fields whose value is empty (an empty read-only row is just noise).
   * Defaults to `true`; set `false` to keep every schema field visible as a static row.
   */
  hideEmpty?: boolean;
  layout?: FormPresentation;
  projection?: ProjectionModel;
  fieldMap?: FormFieldMap;
  fieldProvider?: FormFieldProvider;
  /**
   * Typename of the ref type that the create props apply to.
   * When set, the create affordance is only offered to ref fields whose typename matches.
   */
  createTypename?: string;
};

/**
 * The subset of {@link RefFieldDataProps} that is forwarded down the field recursion. `useResults`
 * is consumed only by `RefField` itself (it defaults internally), so it is not threaded.
 */
export type RefThreadedProps = Pick<
  RefFieldDataProps,
  'useType' | 'getOptions' | 'onCreate' | 'getCreateDefaults' | 'resolveCreateEntry'
>;

/**
 * Form-wide configuration threaded unchanged down the entire field recursion. This is the single
 * canonical source for the bag that `FormContextValue`, `FormFieldProps`, and `FormFieldSetProps`
 * all carry — so none of them re-Picks fragments of the others.
 */
export type FieldContext = FormFieldOptions & CreateOptions & RefThreadedProps;
