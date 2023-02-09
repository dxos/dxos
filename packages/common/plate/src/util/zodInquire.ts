//
// Copyright 2022 DXOS.org
//

import inquirer, { Question } from 'inquirer';
import { z } from 'zod';

// type MaybePromise<T> = T | Promise<T>;

// const isPromise = <T = any>(o: any): o is Promise<T> => o?.then && typeof o.then === 'function';

// const promise = <T = any>(o: any): Promise<T> => (isPromise(o) ? o : Promise.resolve(o));

export const getQuestion = (shape: z.ZodTypeAny): inquirer.Question | null => {
  let defaultValue;
  let message = '';
  let type: string | undefined;
  const typesToQnType: { [k: string]: inquirer.Question['type'] } = {
    ZodString: 'input',
    ZodNumber: 'number',
    ZodBoolean: 'confirm'
  };
  let next = shape;
  while (next && next?._def) {
    const { defaultValue: dv, description, typeName } = next._def;
    if (typeName) {
      if (typeName in typesToQnType) {
        type = typesToQnType[typeName];
      }
    }
    if (dv) {
      defaultValue = dv?.();
    }
    if (description) {
      message = description[description.length - 1] === ':' ? description : description + ':';
    }
    next = next._def?.innerType;
  }
  const validate = (data: any) => {
    const parsed = shape.safeParse(data);
    if (parsed.success === true) {
      return true;
    } else {
      return parsed.error.format()._errors?.join('\n');
    }
  };
  return type ? { message, type, default: defaultValue, validate } : null;
};

export type QuestionGenerator<T extends InquirableZodType = InquirableZodType> = (
  shape: T,
  key: string
) => inquirer.DistinctQuestion | undefined;

export type InquirablePrimitive = z.ZodString | z.ZodNumber | z.ZodBoolean;

export type InquirableZodObject = z.ZodObject<{ [k: string]: InquirablePrimitive | z.ZodDefault<InquirablePrimitive> }>;

// TODO: only three refinements allowed per this need to nest them
export type InquirableZodType =
  | InquirableZodObject
  | z.ZodIntersection<InquirableZodType, InquirableZodType>
  | z.ZodEffects<InquirableZodObject>
  | z.ZodEffects<z.ZodEffects<InquirableZodObject>>
  | z.ZodEffects<z.ZodEffects<z.ZodEffects<InquirableZodObject>>>;

export type QuestionOptions<TInput> = {
  [K in keyof TInput]?: {
    when?: (inputs: TInput) => boolean;
    default?: (inputs: TInput) => TInput[K];
  };
};

export type InquireOptions<T extends InquirableZodType = InquirableZodType> = {
  initialAnswers?: Partial<z.infer<T>>;
  questions?: QuestionOptions<z.infer<T>>;
};

export const getQuestions = async <TShape extends InquirableZodType = InquirableZodType>(
  shape: TShape,
  options?: InquireOptions<TShape>
): Promise<Question[]> => {
  const questions: { [k: string]: Question } = {};
  const extractFromObject = (shape: InquirableZodObject) => {
    const rawShape = shape._def.shape();
    for (const k in rawShape) {
      const v = rawShape[k];
      const qqn = getQuestion(v);
      if (qqn) {
        const qnOptions = options?.questions?.[k as keyof typeof options.questions];
        qqn.default = qnOptions?.default;
        qqn.when = qnOptions?.when as any;
        questions[k] = { ...qqn, name: k };
      }
    }
  };
  const extractFromIntersection = (shape: z.ZodIntersection<InquirableZodType, InquirableZodType>) => {
    const { left, right } = shape._def;
    extractFromType(left);
    extractFromType(right);
  };
  const extractFromType = (shape: InquirableZodType) => {
    if (shape instanceof z.ZodIntersection) {
      extractFromIntersection(shape);
    } else if (shape instanceof z.ZodEffects) {
      extractFromType(shape.innerType());
    } else {
      extractFromObject(shape);
    }
  };
  extractFromType(shape);
  return Object.values(questions).map((r) => {
    // r.askAnswered = true;
    return r;
  });
};

const noUndefined = <T extends object>(o: T) => {
  if (!o) {
    return o;
  }
  const r: T = {} as any;
  for (const i in o) {
    if (typeof o[i] !== 'undefined') {
      r[i] = o[i];
    }
  }
  return r;
};

export const inquire = async <TShape extends InquirableZodType = InquirableZodType>(
  shape: TShape,
  options?: InquireOptions<TShape>
): Promise<z.infer<TShape>> => {
  const questions = await getQuestions(shape, options);
  const responses = (await inquirer.prompt(questions, options?.initialAnswers)) ?? {};
  for (const key in { ...responses, ...(options?.initialAnswers ?? {}), ...(options?.questions ?? {}) }) {
    const defaultFn = options?.questions?.[key as keyof typeof options.questions]?.default;
    if (defaultFn) {
      const defaultVal = defaultFn?.(responses as z.infer<TShape>);
      responses[key] = defaultVal;
    }
  }
  return noUndefined(responses) as z.infer<TShape>;
};
