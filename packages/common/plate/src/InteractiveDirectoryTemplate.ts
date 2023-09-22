//
// Copyright 2023 DXOS.org
//

import { z } from 'zod';

import { DirectoryTemplate, DirectoryTemplateOptions, ExecuteDirectoryTemplateOptions } from './DirectoryTemplate';
import { logger } from './util/logger';
import { FileResults } from './util/template';
import { InquirableZodType, QuestionOptions, inquire, unDefault } from './util/zodInquire';

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

export type InputOf<T> = T extends InteractiveDirectoryTemplate<infer U>
  ? z.TypeOf<U>
  : T extends DirectoryTemplate<infer Z>
  ? Z
  : never;
