//
// Copyright 2023 DXOS.org
//
import callsite from 'callsite';
import path from 'path';

import { InquirableZodType, z } from '.';
import { getOutputNameFromTemplateName } from './util/filenames';
import { Imports } from './util/imports';

type MaybePromise<T> = T | Promise<T>;

type Effect<I = void, O = any> = {
  apply(argument: I): MaybePromise<O>;
};

export type Transform<I, O> = (input: I) => MaybePromise<O>;

export type Slot<R = string, I = any, S extends Slots<I> = Slots<I>> = R | Transform<Context<I, S>, R>;

export type ExtractResult<S extends Slot> = S extends Slot<infer U> ? U : never;

export type Slots<I = any, TSlots extends Slots = {}> = Record<string, Slot<any, I, TSlots>>;

export type Context<I = any, S extends Slots<I> = Slots<I>> = { input: I; slots?: S };

export type Template<I = any, TSlots extends Slots<I> = Slots<I>> = Transform<Context<I, TSlots>, FileResults>;

export type RenderedSlots<TSlots extends Slots> = { [key in keyof TSlots]: ExtractResult<TSlots[key]> };

const renderSlots = async <I = any, TSlots extends Slots<I> = {}>(
  slots: TSlots,
  context: Context<I>
): Promise<RenderedSlots<TSlots>> => {
  const result: RenderedSlots<TSlots> = {} as any;
  for (const key in slots) {
    result[key] = typeof slots[key] === 'function' ? await slots[key](context) : slots[key];
  }
  return result;
};

const slotDefault = <T>(slot: Slot<T>, value: T) => {
  return typeof slot === 'function' ? (context: any) => (slot as Function)(context) ?? value : slot ?? value;
};

export type Path = string | string[];

export type FileSlots<I = any, TSlots extends Slots<I> = {}> = {
  path?: Slot<Path, I, TSlots>;
  content: Slot<string, I, TSlots>;
  copyOf?: Slot<string, I, TSlots>;
};

class FileEffect implements Effect {
  public path: Path = '';
  public content = '';
  public copyOf?: string;

  static isFileEffect = (o: any): o is FileEffect => {
    return o?.path && o?.content;
  };

  constructor(private readonly slots: RenderedSlots<FileSlots>) {
    Object.assign(this, slots);
  }

  async save() {}

  async apply() {
    await this.save();
  }
}

type FileResults<I = any, S extends FileSlots<I> = FileSlots<I>> = Effect<Context<I, S>> & {
  files: FileEffect[];
};

const results = (files: FileEffect[]): FileResults => ({
  files,
  apply: async () => Promise.all(files.map((e) => e.apply()))
});

type Group<I = any> = (context: Context<I, any>) => Template<I, any>[];

// directory templates
export type FilterExpression = string | RegExp;

export type Filter<TInput = any> = FilterExpression[] | ((input: TInput) => FilterExpression[]);

class TemplateFactory<I = null, TSlots extends Slots<I> = {}> {
  constructor(private parentSlots?: TSlots) {}

  text(slots: FileSlots<I, TSlots>): Template<I, TSlots> {
    const stack = callsite();
    const templateFile = stack[1].getFileName();

    return async (context: Context<I, TSlots>) => {
      const {
        content,
        path: p,
        copyOf
      } = {
        path: getOutputNameFromTemplateName(path.basename(templateFile)),
        ...(await renderSlots(slots, context))
      };
      return results([
        new FileEffect({
          path: p,
          content,
          copyOf
        })
      ]);
    };
  }

  ecmascript(slots: FileSlots<I, TSlots>): Template<I, TSlots> {
    return async (context: Context<I>) => {
      const imports = new Imports();
      const effects: FileEffect[] = []; // ? compute results here
      return results(effects);
    };
  }

  slots<TNewSlots extends Slots<I>>(slots: TNewSlots) {
    return new TemplateFactory<I, TNewSlots>(slots);
  }

  input<TNewInput>() {
    return new TemplateFactory<TNewInput, TSlots>();
  }

  group(grouping: Group<I>): Template<I> {
    return async (context: Context<I>) => {
      const groupingResults = await Promise.all(grouping(context)?.map((template) => template(context)));
      return results(groupingResults.map((r) => r.files).flat());
    };
  }
}

export type DirectoryTemplateOptions<I = any> = {
  inherits?: Template<I>;
  include?: Filter<I>;
  exclude?: Filter<I>;
  defaultInput?: Partial<I>;
  before?: Template<I>;
  after?: Template<FileResults[]>;
  context?: (context: Context<I>) => MaybePromise<Context<I>>;
};

export class DirectoryTemplate<I = any> implements Effect<Context<I>, FileResults> {
  constructor(public readonly options: DirectoryTemplateOptions<I>) {}

  public define = new TemplateFactory<I>();

  async apply(context: Context<I>): Promise<FileResults> {
    return results([]);
  }
}

// with inquirer
interface InteractiveDirectoryTemplateOptions<IShape extends InquirableZodType>
  extends DirectoryTemplateOptions<z.infer<IShape>> {
  inputShape: IShape;
  inputQuestions?: any;
}

export class InteractiveDirectoryTemplate<I extends InquirableZodType> extends DirectoryTemplate<z.infer<I>> {
  public readonly inputShape: I;
  constructor(public override readonly options: InteractiveDirectoryTemplateOptions<I>) {
    super(options);
    this.inputShape = options.inputShape;
  }
}

export type TemplateOptions<I extends InquirableZodType> = InteractiveDirectoryTemplateOptions<I>;

export const template = <TInput = null>() => new TemplateFactory<TInput>();

export const directory = <I extends InquirableZodType>(options: TemplateOptions<I>) => {
  return new InteractiveDirectoryTemplate(options);
};
