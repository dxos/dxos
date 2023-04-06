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

type Result = {
  effects: Effect[];
  commit(): Promise<any>;
};

const result = (effects: Effect[]) => ({
  effects,
  commit: async () => Promise.all(effects.map((e) => e.commit()))
});
type Slots<I = any> = {
  [name: string]: Slot<any, I>;
};

type Context<I = any, S extends Slots<I> = Slots<I>> = { input: I; slots: S };

type Slot<R = string, I = any> = R | ((context: Context<I>) => MaybePromise<R>);

type Path = string | string[];

type Template<I = any> = Slot<Result, I>;

type FileOptions<I = any> = {
  path?: Slot<Path, I>;
  content: Slot<string, I>;
} & Slots<I>;

const ts = <I = any>(options: FileOptions<I>): Template<I> => {
  return async (context: Context<I>) => {
    const effects: Effect[] = [];
    return result(effects);
  };
};

type TemplateOptions<I = any> = (context: Context<I>) => Template<I>[];

const template = <I = any>(options: TemplateOptions<I>): Template<I> => {
  return async (context: Context<I>) => {
    const effects: Effect[] = await Promise.all(options(context)?.map((template) => execute(template, context)));
    return result(effects);
  };
};

const execute = async <I = any>(template: Template<I>, context: Context<I>) => {
  return typeof template === 'function' ? template?.(context) : template;
};


// in file foobar.tsx
type Input = { name: string };

const foobarTemplate = ts<Input>({
  content: async (context) => `my string ${context.input.name}`
});

// in file foobar2.tsx
const multipleOutputs = template<Input>(() => {
  return [
    foobarTemplate,
    ts<Input>({
      content: ({ input }) => `${input.name}`
    })
  ];
});

