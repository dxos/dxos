//
// Copyright 2025 DXOS.org
//

import * as Doc from '@effect/printer/Doc';
import * as Ansi from '@effect/printer-ansi/Ansi';
import * as Option from 'effect/Option';
import * as Pipeable from 'effect/Pipeable';

export type FormBuilderOptions = {
  title?: string;
  prefix?: string;
};

export interface FormBuilder extends Pipeable.Pipeable {
  readonly entries: ReadonlyArray<{ key: string; value: Doc.Doc<any>; isNested?: boolean }>;
  readonly title?: string;
  readonly prefix: string;
}

class FormBuilderImpl implements FormBuilder {
  readonly entries: Array<{ key: string; value: Doc.Doc<any>; isNested?: boolean }> = [];
  readonly title?: string;
  readonly prefix: string;

  constructor(options: FormBuilderOptions = {}) {
    this.title = options.title;
    this.prefix = options.prefix ?? '- ';
  }

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return Pipeable.pipeArguments(this, arguments);
  }
}

/**
 * Creates a new FormBuilder instance.
 */
export const make = (props?: FormBuilderOptions): FormBuilder => new FormBuilderImpl(props);

// Helper to calculate dimensions for formatting
const calculateDimensions = (entries: ReadonlyArray<{ key: string }>, prefix: string) => {
  const maxKeyLen = Math.max(0, ...entries.map((entry) => entry.key.length));
  const targetWidth = prefix.length + maxKeyLen + 2;
  return { maxKeyLen, targetWidth };
};

// Helper to build a formatted key line
const buildKeyLine = (prefix: string, key: string, targetWidth: number) => {
  // Use fill to pad the key to targetWidth.
  // Note: We don't add indentation here; indentation is handled by the parent container or nestImpl.
  return Doc.annotate(Doc.fill(targetWidth)(Doc.text(prefix + key + ': ')), Ansi.blackBright);
};

// Implementation helper
const setImpl = <T>(
  builder: FormBuilder,
  key: string,
  value: T,
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): FormBuilder => {
  if (value !== undefined) {
    let valueDoc: Doc.Doc<any>;
    if (typeof value === 'object' && value !== null) {
      // Assume it's a Doc.Doc
      valueDoc = value as unknown as Doc.Doc<any>;
    } else {
      valueDoc = Doc.text(String(value));
    }

    if (color) {
      const ansi = typeof color === 'function' ? color(value as T) : color;
      valueDoc = Doc.annotate(valueDoc, ansi);
    }

    (builder as FormBuilderImpl).entries.push({
      key,
      value: valueDoc,
      isNested: false,
    });
  }
  return builder;
};

/**
 * Adds a key-value pair to the form.
 */
export function set<T>(
  builder: FormBuilder,
  key: string,
  value: T,
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): FormBuilder;
export function set<T>(
  key: string,
  value: T,
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): (builder: FormBuilder) => FormBuilder;
export function set<T>(
  builderOrKey: FormBuilder | string,
  keyOrValue?: string | T,
  valueOrColor?: T | Ansi.Ansi | ((value: T) => Ansi.Ansi),
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): FormBuilder | ((builder: FormBuilder) => FormBuilder) {
  if (builderOrKey instanceof FormBuilderImpl) {
    // Direct: set(builder, key, value, color?)
    const builder = builderOrKey;
    const key = keyOrValue as string;
    const value = valueOrColor as T;
    return setImpl(builder, key, value, color);
  } else {
    // Curried: set(key, value, color?)
    const key = builderOrKey as string;
    const value = keyOrValue as T;
    const color = valueOrColor as Ansi.Ansi | ((value: T) => Ansi.Ansi) | undefined;
    return (builder: FormBuilder) => setImpl(builder, key, value, color);
  }
}

// Implementation helper
const nestImpl = (parent: FormBuilder, key: string, builder: FormBuilder): FormBuilder => {
  // Build nested entries without title, directly under the parent field name

  // Create a temporary builder without title to ignore it.
  const nestedBuilder: FormBuilder = {
    ...builder,
    title: undefined,
    entries: builder.entries,
  };

  // Build content.
  let valueDoc = build(nestedBuilder);

  // Indent the content by 2 spaces.
  // This ensures that when this doc is embedded in the parent, it is visually nested.
  valueDoc = Doc.indent(valueDoc, 2);

  (parent.entries as Array<{ key: string; value: Doc.Doc<any>; isNested?: boolean }>).push({
    key,
    value: valueDoc,
    isNested: true,
  });
  return parent;
};

/**
 * Nests another form builder under a key.
 */
export function nest(parent: FormBuilder, key: string, builder: FormBuilder): FormBuilder;
export function nest(key: string, builder: FormBuilder): (parent: FormBuilder) => FormBuilder;
export function nest(
  parentOrKey: FormBuilder | string,
  keyOrBuilder?: string | FormBuilder,
  builder?: FormBuilder,
): FormBuilder | ((parent: FormBuilder) => FormBuilder) {
  if (parentOrKey instanceof FormBuilderImpl) {
    // Direct: nest(parent, key, builder)
    const parent = parentOrKey;
    const key = keyOrBuilder as string;
    return nestImpl(parent, key, builder!);
  } else {
    // Curried: nest(key, builder)
    const key = parentOrKey as string;
    const builder = keyOrBuilder as FormBuilder;
    return (parent: FormBuilder) => nestImpl(parent, key, builder);
  }
}

// Implementation helper
const optionImpl = <T>(
  builder: FormBuilder,
  key: string,
  value: Option.Option<T>,
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): FormBuilder => {
  if (Option.isSome(value)) {
    return setImpl(builder, key, value.value, color);
  }
  return builder;
};

/**
 * Adds an optional value if it exists.
 */
export function option<T>(
  builder: FormBuilder,
  key: string,
  value: Option.Option<T>,
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): FormBuilder;
export function option<T>(
  key: string,
  value: Option.Option<T>,
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): (builder: FormBuilder) => FormBuilder;
export function option<T>(
  builderOrKey: FormBuilder | string,
  keyOrValue?: string | Option.Option<T>,
  valueOrColor?: Option.Option<T> | Ansi.Ansi | ((value: T) => Ansi.Ansi),
  color?: Ansi.Ansi | ((value: T) => Ansi.Ansi),
): FormBuilder | ((builder: FormBuilder) => FormBuilder) {
  if (builderOrKey instanceof FormBuilderImpl) {
    // Direct: option(builder, key, value, color?)
    const builder = builderOrKey;
    const key = keyOrValue as string;
    const value = valueOrColor as Option.Option<T>;
    return optionImpl(builder, key, value, color);
  } else {
    // Curried: option(key, value, color?)
    const key = builderOrKey as string;
    const value = keyOrValue as Option.Option<T>;
    const color = valueOrColor as Ansi.Ansi | ((value: T) => Ansi.Ansi) | undefined;
    return (builder: FormBuilder) => optionImpl(builder, key, value, color);
  }
}

// Implementation helper
const nestedOptionImpl = (builder: FormBuilder, key: string, value: Option.Option<FormBuilder>): FormBuilder => {
  if (Option.isSome(value)) {
    return nestImpl(builder, key, value.value);
  }
  return builder;
};

/**
 * Nests an optional form builder if it exists.
 */
export function nestedOption(builder: FormBuilder, key: string, value: Option.Option<FormBuilder>): FormBuilder;
export function nestedOption(key: string, value: Option.Option<FormBuilder>): (builder: FormBuilder) => FormBuilder;
export function nestedOption(
  builderOrKey: FormBuilder | string,
  keyOrValue?: string | Option.Option<FormBuilder>,
  value?: Option.Option<FormBuilder>,
): FormBuilder | ((builder: FormBuilder) => FormBuilder) {
  if (builderOrKey instanceof FormBuilderImpl) {
    // Direct: nestedOption(builder, key, value)
    const builder = builderOrKey;
    const key = keyOrValue as string;
    return nestedOptionImpl(builder, key, value!);
  } else {
    // Curried: nestedOption(key, value)
    const key = builderOrKey as string;
    const value = keyOrValue as Option.Option<FormBuilder>;
    return (builder: FormBuilder) => nestedOptionImpl(builder, key, value);
  }
}

// Implementation helper
const whenImpl = (builder: FormBuilder, condition: any, ...ops: ((b: FormBuilder) => FormBuilder)[]): FormBuilder => {
  if (condition) {
    for (const op of ops) {
      op(builder);
    }
  }
  return builder;
};

/**
 * Conditionally executes operations.
 */
export function when(builder: FormBuilder, condition: any, ...ops: ((b: FormBuilder) => FormBuilder)[]): FormBuilder;
export function when(
  condition: any,
  ...ops: ((b: FormBuilder) => FormBuilder)[]
): (builder: FormBuilder) => FormBuilder;
export function when(
  builderOrCondition: FormBuilder | any,
  conditionOrOp?: any | ((b: FormBuilder) => FormBuilder),
  ...ops: ((b: FormBuilder) => FormBuilder)[]
): FormBuilder | ((builder: FormBuilder) => FormBuilder) {
  if (builderOrCondition instanceof FormBuilderImpl) {
    // Direct: when(builder, condition, ...ops)
    const builder = builderOrCondition;
    const condition = conditionOrOp;
    return whenImpl(builder, condition, ...ops);
  } else {
    // Curried: when(condition, ...ops)
    const condition = builderOrCondition;
    const allOps = [conditionOrOp, ...ops].filter(
      (op): op is (b: FormBuilder) => FormBuilder => typeof op === 'function',
    );
    return (builder: FormBuilder) => whenImpl(builder, condition, ...allOps);
  }
}

// Implementation helper
const eachImpl = <T>(
  builder: FormBuilder,
  items: T[],
  fn: (item: T) => (b: FormBuilder) => FormBuilder,
): FormBuilder => {
  items.forEach((item) => fn(item)(builder));
  return builder;
};

/**
 * Iterates over an array of items.
 */
export function each<T>(
  builder: FormBuilder,
  items: T[],
  fn: (item: T) => (b: FormBuilder) => FormBuilder,
): FormBuilder;
export function each<T>(
  items: T[],
  fn: (item: T) => (b: FormBuilder) => FormBuilder,
): (builder: FormBuilder) => FormBuilder;
export function each<T>(
  builderOrItems: FormBuilder | T[],
  itemsOrFn?: T[] | ((item: T) => (b: FormBuilder) => FormBuilder),
  fn?: (item: T) => (b: FormBuilder) => FormBuilder,
): FormBuilder | ((builder: FormBuilder) => FormBuilder) {
  if (builderOrItems instanceof FormBuilderImpl) {
    // Direct: each(builder, items, fn)
    const builder = builderOrItems;
    const items = itemsOrFn as T[];
    return eachImpl(builder, items, fn!);
  } else {
    // Curried: each(items, fn)
    const items = builderOrItems as T[];
    const fn = itemsOrFn as (item: T) => (b: FormBuilder) => FormBuilder;
    return (builder: FormBuilder) => eachImpl(builder, items, fn);
  }
}

/**
 * Builds the final document.
 */
export const build = (builder: FormBuilder): Doc.Doc<any> => {
  const { targetWidth } = calculateDimensions(builder.entries, builder.prefix);
  const entryLines: Doc.Doc<any>[] = [];

  builder.entries.forEach(({ key, value, isNested }) => {
    const keyLine = buildKeyLine(builder.prefix, key, targetWidth);
    if (isNested) {
      // Nested content should start on a new line.
      // value is already indented by nestImpl, so we just cat with hardLine.
      entryLines.push(Doc.hcat([keyLine, Doc.hardLine, value]));
    } else {
      // Single-line value, combine key and value.
      // If the value itself is multiline (e.g. from Doc.string with newlines, though Doc handles that specifically),
      // we might want layout flexibility.
      // For now, standard behavior:
      entryLines.push(Doc.hcat([keyLine, value]));
    }
  });

  const entriesDoc = Doc.vsep(entryLines);

  if (builder.title) {
    const titleDoc = Doc.hcat([Doc.annotate(Doc.text(builder.title), Ansi.combine(Ansi.bold, Ansi.cyan))]);
    // Join title and entries with a single line break, no extra spacing
    return Doc.cat(titleDoc, Doc.cat(Doc.line, entriesDoc));
  }

  return entriesDoc;
};
