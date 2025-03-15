//
// Copyright 2023 DXOS.org
//

import callsite from 'callsite';
import path from 'node:path';
import { type z } from 'zod';

import {
  BASENAME,
  DirectoryTemplate,
  type DirectoryTemplateLoadOptions,
  type DirectoryTemplateOptions,
  type ExecuteDirectoryTemplateOptions,
} from './DirectoryTemplate';
import { safeLoadModule } from './util/loadModule';
import { logger } from './util/logger';
import { type Optional } from './util/optional';
import { type FileResults } from './util/template';
import { type InquirableZodType, type QuestionOptions, inquire, unDefault } from './util/zodInquire';

// export type QuestionOptions<TInput> = {
//   [K in keyof TInput]?: {
//     when?: (inputs: TInput) => boolean;
//     default?: (inputs: TInput) => TInput[K];
//   };
// };
export interface InteractiveDirectoryTemplateOptions<IShape extends InquirableZodType>
  extends DirectoryTemplateOptions<z.infer<IShape>> {
  inputShape: IShape;
  inputQuestions?: QuestionOptions<z.infer<IShape>>;
}

export interface ExecuteInteractiveDirectoryTemplateOptions<IShape extends InquirableZodType>
  extends ExecuteDirectoryTemplateOptions<z.infer<IShape>> {
  interactive?: boolean;
}

const acquireInput = async <TInput>(
  inputShape: InquirableZodType,
  input?: Partial<TInput> | undefined,
  questionOptions?: QuestionOptions<TInput>,
  verbose?: boolean,
): Promise<TInput> => {
  const log = logger(!!verbose);
  const parse = unDefault(inputShape).safeParse(input);
  if (!parse.success) {
    const inquired = (await inquire(inputShape, {
      initialAnswers: input,
      questions: questionOptions,
    })) as TInput;
    log('inquired result:');
    log(inquired);
    const inquiredParsed = inputShape.safeParse(inquired);
    if (!inquiredParsed.success) {
      throw new Error('invalid input: ' + formatErrors(inquiredParsed.error.errors));
    }
    input = inquiredParsed.data as TInput;
  } else {
    const parseWithEffects = inputShape.safeParse(input);
    if (!parseWithEffects.success) {
      throw new Error('invalid input: ' + formatErrors(parseWithEffects.error.errors));
    }
    input = parse.data as TInput;
  }
  return input as TInput;
};

const formatErrors = (errors?: { message: string }[]) => errors?.map((e) => e?.message)?.join(', ');

export class InteractiveDirectoryTemplate<I extends InquirableZodType> extends DirectoryTemplate<z.infer<I>> {
  public readonly inputShape: I;
  constructor(public override readonly options: InteractiveDirectoryTemplateOptions<I>) {
    super(options);
    this.inputShape = options.inputShape;
  }

  override async apply(options: ExecuteInteractiveDirectoryTemplateOptions<I>): Promise<FileResults<z.infer<I>>> {
    const { inputShape, inputQuestions } = this.options;
    const { interactive, input, ...rest } = options;
    let acquired: Partial<z.infer<I>> = { ...this.options.defaultInput, ...input };
    if (inputShape) {
      if (interactive) {
        acquired = await acquireInput(inputShape, acquired, inputQuestions, options.verbose);
      } else {
        const parse = inputShape.safeParse(acquired);
        if (!parse.success) {
          throw new Error('invalid input: ' + formatErrors([parse.error]));
        }
        acquired = parse.data as any;
      }
    }
    return super.apply({ input: acquired, ...rest });
  }
}

export type InputOf<T> =
  T extends InteractiveDirectoryTemplate<infer U> ? z.TypeOf<U> : T extends DirectoryTemplate<infer Z> ? Z : never;

export type TemplateOptions<I> = Optional<DirectoryTemplateOptions<I>, 'src'>;

export const directory = <I>(options: TemplateOptions<I>) => {
  const stack = callsite();
  const templateFile = stack[1].getFileName();
  const dir = path.dirname(templateFile);
  const { src, ...rest } = { src: dir, ...options };
  return new DirectoryTemplate({
    src: path.isAbsolute(src) ? src : path.resolve(dir, src),
    ...rest,
  });
};

export type InteractiveTemplateOptions<I extends InquirableZodType> = Optional<
  InteractiveDirectoryTemplateOptions<I>,
  'src'
>;

export const interactiveDirectory = <I extends InquirableZodType>(options: InteractiveTemplateOptions<I>) => {
  const stack = callsite();
  const templateFile = stack[1].getFileName();
  const dir = path.dirname(templateFile);
  const { src, ...rest } = { src: dir, ...options };
  return new InteractiveDirectoryTemplate({
    src: path.isAbsolute(src) ? src : path.resolve(dir, src),
    ...rest,
  });
};

export const loadTemplate = async <T = InteractiveDirectoryTemplate<any>>(
  src: string,
  options?: DirectoryTemplateLoadOptions,
) => {
  const tsName = path.resolve(src, BASENAME + '.ts');
  const jsName = path.resolve(src, BASENAME + '.js');
  const { verbose } = { verbose: false, ...options };
  try {
    const module = (await safeLoadModule(tsName, options))?.module ?? (await safeLoadModule(jsName, options))?.module;
    const config = { ...module?.default };
    return config as T;
  } catch (err: any) {
    if (verbose) {
      console.warn('exception while loading template config:\n' + err.toString());
    }
    throw err;
  }
};

export const executeDirectoryTemplate = async <I extends InquirableZodType>(
  options: ExecuteInteractiveDirectoryTemplateOptions<I>,
) => {
  const { src, verbose } = options;
  if (!src) {
    throw new Error('cannot load template without an src option');
  }
  const template = await loadTemplate(src, { verbose });
  if (!template) {
    throw new Error(`failed to load template function from ${src}`);
  }
  if (!(template instanceof DirectoryTemplate)) {
    throw new Error(`template is not an executable template ${src}`);
  }
  if (!template.apply) {
    throw new Error(`template does not have an apply function ${src}`);
  }
  try {
    return template.apply(options);
  } catch (err) {
    console.error(`problem in template ${src}`);
    throw err;
  }
};
