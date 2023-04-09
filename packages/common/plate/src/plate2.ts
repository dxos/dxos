import { InquirableZodType, z } from '..';
//
// Copyright 2023 DXOS.org
//
type Tag<R> = (str: string, ...args: any[]) => R;

type MaybePromise<T> = T | Promise<T>;

type Effect = {
  commit(): Promise<any>;
};

class FileEffect implements Effect {
  constructor() {}
  async commit() {}
}

type Results<R = Effect> = {
  results: R[];
  commit(): Promise<any>;
};

const results = (effects: Effect[]): Results => ({
  results: effects,
  commit: async () => Promise.all(effects.map((e) => e.commit()))
});

type Slots<I = any> = {
  [name: string]: Slot<any, I>;
};

type Context<I = any, S extends Slots<I> = Slots<I>> = { input: I; slots?: S };

type Slot<R = string, I = any, S extends Slots<I> = Slots<I>> = R | ((context: Context<I, S>) => MaybePromise<R>);

type Path = string | string[];

type Template<I = any, TSlots extends Slots<I> = Slots<I>> = Slot<Results, I, TSlots>;

type FileSlots<I = any> = {
  path?: Slot<Path, I>;
  content: Slot<string, I>;
} & Slots<I>;

export const text = <I = any, TSlots extends FileSlots<I> = FileSlots<I>>(options: TSlots): Template<I, TSlots> => {
  return async (context: Context<I, TSlots>) => {
    const effects: Effect[] = [];
    return results(effects);
  };
};

export const ts = <I = any>(options: FileSlots<I>): Template<I> => {
  return async (context: Context<I>) => {
    // const imports = new Imports();
    const effects: Effect[] = []; // ?
    return results(effects);
  };
};

type Group<I = any, S extends Slots<I> = Slots<I>> = (context: Context<I, S>) => Template<I>[];

export const group = <I = any>(options: Group<I>): Template<I> => {
  return async (context: Context<I>) => {
    const effects = await Promise.all(options(context)?.map((template) => execute(template, context)));
    return results(effects);
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

export class DirectoryTemplate<I = any> {
  constructor(public readonly options: DirectoryTemplateOptions<I>) {}

  async execute(context: Context<I>): Promise<Results> {
    return results([]);
  }

  text(slots: FileSlots<I>) {
    return text(slots);
  }

  ts(slots: FileSlots<I>) {
    return ts(slots);
  }

  group(def: Group<I>) {
    return group(def);
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
