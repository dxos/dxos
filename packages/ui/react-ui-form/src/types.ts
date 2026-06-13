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
   * Dotted JSON path of this field within the form values (e.g. `runtime.client.storage.persistent`).
   */
  jsonPath?: string;
  placeholder?: string;
  autoFocus?: boolean;
  layout?: FormPresentation;
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
  getOptions?: (objects: Entity.Any[], options?: { parentLabel?: boolean }) => RefOption[];
  /**
   * Persist a newly-created object. Called after the user fills out the inline create form and
   * clicks Save. Should add the object to the database and return it (sync or async). The returned
   * object is then wired into this slot's form value as a Ref.
   */
  onCreate?: (schema: Type.AnyEntity, values: any) => Obj.Unknown | Promise<Obj.Unknown> | undefined | void;
};

/**
 * Form-wide field options carried by the form context and threaded down to every field. The
 * canonical source for the config that `FormContextValue`, `FormFieldProps`, and `FormFieldSetProps`
 * all share — so none of them has to reach "up" into another's props to express it.
 */
export type FormFieldOptions = {
  db?: Database.Database;
  readonly?: boolean;
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
