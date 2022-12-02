import { z } from "zod";
import inquirer, { Question } from "inquirer";

type MaybePromise<T> = T | Promise<T>;

function isPromise<T = any>(o: any): o is Promise<T> {
  return o?.then && typeof o.then == "function";
}

function promise<T = any>(o: any): Promise<T> {
  return isPromise(o) ? o : Promise.resolve(o);
}

export function getQuestion(shape: z.ZodTypeAny): inquirer.Question | null {
  let defaultValue = void 0,
    message = "",
    type: string | undefined = void 0;
  const typesToQnType: { [k: string]: inquirer.Question["type"] } = {
    ZodString: "input",
    ZodNumber: "number",
    ZodBoolean: "confirm",
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
      message =
        description[description.length - 1] == ":"
          ? description
          : description + ":";
    }
    next = next._def?.innerType;
  }
  function validate(data: any) {
    const parsed = shape.safeParse(data);
    if (parsed.success === true) {
      return true;
    } else {
      return parsed.error.format()._errors?.join("\n");
    }
  }
  return type ? { message, type, default: defaultValue, validate } : null;
}

export type QuestionGenerator<T extends z.ZodRawShape = z.ZodRawShape> = (
  shape: T[keyof T],
  key: keyof T
) => inquirer.DistinctQuestion[] | undefined;

export type InquireOptions<T extends z.ZodObject<z.ZodRawShape>> = {
  defaults?:
    | Partial<z.infer<T>>
    | ((answers: Partial<z.infer<T>>) => MaybePromise<Partial<z.infer<T>>>);
  questionGenerator?: QuestionGenerator<z.ZodRawShape>;
};

export async function getQuestions<
  T extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
>(shape: T, options?: InquireOptions<T>): Promise<Question[]> {
  const questions = [];
  function defaultHook(q: Question, key: string) {
    const d = q.default;
    return async (answers: any) => {
      if (typeof options?.defaults == "function") {
        return (await promise(options.defaults(answers)))?.[key] ?? d;
      } else if (typeof options?.defaults == "object") {
        return options.defaults[key] ?? d;
      }
      return d;
    };
  }
  const rawShape = shape._def.shape();
  for (let k in rawShape) {
    const v = rawShape[k];
    const qqn = getQuestion(v);
    if (qqn) {
      qqn.default = defaultHook(qqn, k);
      questions.push({ ...qqn, name: k });
    } else if (options?.questionGenerator) {
      const qqns = options.questionGenerator?.(v, k);
      if (qqns) {
        questions.push(...qqns);
      }
    }
  }
  return questions?.map((r) => {
    r.askAnswered = true;
    return r;
  });
}

function noUndefined<T extends object>(o: T) {
  if (!o) return o;
  const r: T = {} as any;
  for (let i in o) {
    if (typeof o[i] !== "undefined") {
      r[i] = o[i];
    }
  }
  return r;
}

export async function inquire<
  T extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
>(shape: T, options?: InquireOptions<T>): Promise<z.infer<T>> {
  const questions = await getQuestions(shape, options);
  const responses =
    (await inquirer.prompt(
      questions,
      typeof options?.defaults != "function" ? options?.defaults : {}
    )) ?? {};
  return noUndefined(responses);
}
