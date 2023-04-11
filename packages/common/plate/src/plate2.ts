//
// Copyright 2023 DXOS.org
//
import callsite from 'callsite';

import { InquirableZodType, z } from '..';

type MaybePromise<T> = T | Promise<T>;

type Effect = {
  commit(): Promise<any>;
};

export type Context<I = any, S extends Slots<I> = Slots<I>> = { input: I; slots?: S };

export type Slot<R = string, I = any, S extends Slots<I> = Slots<I>> =
  | R
  | ((context: Context<I, S>) => MaybePromise<R>);

export type Slots<I = any, TSlots extends Slots = {}> = Record<string, Slot<any, I, TSlots>>;

const renderSlot = async <I = any, TSlots extends Slots<I> = {}>(
  slots: TSlots,
  slotName: keyof TSlots,
  context: Context<I, TSlots>
) => {
  return '';
};

export type Path = string | string[];
class FileEffect<I = any, TSlots extends Slots<I> = {}> implements Effect {
  path?: string;
  content?: string;
  copyOf?: string;

  static isFileEffect = (o: any): o is FileEffect => {
    return o?.path && o?.content;
  };

  constructor(private readonly slots: FileSlots<I> & TSlots) {}

  async render(context: Context<I, TSlots>) {
    const { slots } = this;
    this.content = await renderSlot(slots, 'content', context);
    this.path = await renderSlot(slots, 'path', context);
    this.copyOf = await renderSlot(slots, 'copyOf', context);
  }

  async commit() {}
}

type Results<R = FileEffect> = {
  files: R[];
  commit(): Promise<any>;
};

const results = (files: FileEffect[]): Results => ({
  files,
  commit: async () => Promise.all(files.map((e) => e.commit()))
});

export type Template<I = any, TSlots extends Slots<I> = Slots<I>> = (
  context: Context<I, TSlots>
) => MaybePromise<Results>;

export type FileSlots<I = any, TSlots extends Slots<I> = {}> = {
  path?: Slot<Path, I, TSlots>;
  content: Slot<string, I, TSlots>;
  copyOf?: Slot<string, I, TSlots>;
};

export const slots = <I = any, TSlots extends Slots<I> = {}>(slots: TSlots) => {
  return new Plate(slots);
};

export class Plate<I = any, TSlots extends Slots<I> = {}> {
  constructor(private readonly _slots: TSlots) {}

  text(options: FileSlots<I, TSlots>): Template<I, TSlots> {
    const stack = callsite();
    const templateFile = stack[1].getFileName();
    return async (context: Context<I, TSlots>) => {
      return results([new FileEffect()]);
    };
  }

  ts(options: FileSlots<I, TSlots>): Template<I> {
    return async (context: Context<I>) => {
      // const imports = new Imports();
      const effects: FileEffect[] = []; // ?
      return results(effects);
    };
  }

  slots<USlots extends Slots<I>>(slots: USlots) {
    return new Plate<I, USlots>(slots);
  }
}

export const text = <I = any, TSlots extends FileSlots<I> = FileSlots<I>>(slots: TSlots): Template<I, TSlots> => {
  return async (context: Context<I, TSlots>) => {
    const effects: FileEffect[] = [];
    return results(effects);
  };
};

type Group<I = any, S extends Slots<I> = Slots<I>> = (context: Context<I, S>) => Template<I>[];

export const group = <I = any>(grouping: Group<I>): Template<I> => {
  return async (context: Context<I>) => {
    const groupingResults = await Promise.all(grouping(context)?.map((template) => execute(template, context)));
    return results(groupingResults.map((r) => r.files).flat());
  };
};

const execute = async <I = any>(template: Template<I>, context: Context<I>) => {
  return typeof template === 'function' ? template?.(context) : template;
};

// directory templates
export type FilterExpression = string | RegExp;

export type Filter<TInput = any> = FilterExpression[] | ((input: TInput) => FilterExpression[]);

export type DirectoryTemplateOptions<I = any> = {
  inherits?: Template<I>;
  include?: Filter<I>;
  exclude?: Filter<I>;
  defaults?: Partial<I>;
  before?: Template<I>;
  after?: Template<Results[]>;
  context?: (context: Context<I>) => MaybePromise<Context<I>>;
};

export class DirectoryTemplate<I = any> extends Plate<I> {
  constructor(public readonly options: DirectoryTemplateOptions<I>) {
    super({});
  }

  async execute(context: Context<I>): Promise<Results> {
    return results([]);
  }
}

// with inquirer
interface InteractiveDirectoryTemplateOptions<IShape extends InquirableZodType>
  extends DirectoryTemplateOptions<z.infer<IShape>> {
  input: IShape;
  questions?: any;
}

export class InteractiveDirectoryTemplate<I extends InquirableZodType> extends DirectoryTemplate<z.infer<I>> {
  public readonly input: I;
  constructor(public override readonly options: InteractiveDirectoryTemplateOptions<I>) {
    super(options);
    this.input = options.input;
  }
}
