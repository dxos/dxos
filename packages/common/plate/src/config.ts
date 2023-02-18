//
// Copyright 2022 DXOS.org
//

import callsite from 'callsite';
import path from 'path';
import { z } from 'zod';

import {
  executeDirectoryTemplate,
  DirectoryTemplateOptions,
  ExecuteDirectoryTemplateOptions,
  DirectoryTemplateResult
} from './executeDirectoryTemplate';
import { TEMPLATE_FILE_IGNORE, Files } from './executeFileTemplate';
import { LoadModuleOptions, safeLoadModule } from './util/loadModule';
import { logger } from './util/logger';
import { InquirableZodType, InquirableZodObject, InquirablePrimitive, QuestionOptions } from './util/zodInquire';

export { QuestionOptions };

export type FilterExpression = string | RegExp;

export type Filter<TInput = any> = FilterExpression[] | ((input: TInput) => FilterExpression[]);

export type ConfigDeclaration<
  TShape extends InquirableZodType = InquirableZodType,
  TInheritedShape extends InquirableZodType = InquirableZodType
> = {
  inherits?: ConfigDefinition<TInheritedShape>;
  include?: Filter<z.infer<TShape>>;
  exclude?: Filter<z.infer<TShape>>;
  inputShape?: TShape;
  inputQuestions?: QuestionOptions<z.infer<TShape>>;
  message?: (
    context: Required<DirectoryTemplateOptions<z.infer<TShape>>> & {
      results: Files;
      inheritedMessage?: string;
    }
  ) => string;
};

export type ConfigDefinition<
  TInput extends InquirableZodType = InquirableZodType,
  TInherited extends InquirableZodType = InquirableZodType
> = ConfigDeclaration<TInput, TInherited> & {
  templateDirectory: string;
  execute(options?: ExecuteSpecificDirectoryTemplateOptions<z.infer<TInput>>): Promise<DirectoryTemplateResult>;
};

export type ExecuteSpecificDirectoryTemplateOptions<TInput> = Omit<
  ExecuteDirectoryTemplateOptions<TInput>,
  'templateDirectory'
>;

export const defineConfig = <
  I extends InquirableZodType = InquirableZodType,
  U extends InquirableZodType = InquirableZodType
>(
  config: ConfigDeclaration<I, U>
): ConfigDefinition<I, U> => {
  const stack = callsite();
  const requester = stack[1].getFileName();
  const templateDirectory = path.dirname(requester);
  const merged = [defaultConfig, config?.inherits ?? {}, config].reduce(
    // TODO(zhenyasav): remove these any casts
    (memo, next) => (next ? mergeConfigs(memo as any, next as any) : memo),
    {}
  );
  return {
    // TODO(zhenyasav): remove this cast
    ...(merged as ConfigDefinition<I, U>),
    templateDirectory,
    execute: async (options?: ExecuteSpecificDirectoryTemplateOptions<z.infer<I>>) => {
      return executeDirectoryTemplate({
        ...options,
        templateDirectory
      });
    }
  };
};

const exclude = [/\.t\//, /node_modules/, ...TEMPLATE_FILE_IGNORE];

export const defaultConfig: ConfigDeclaration = {
  exclude
};

export type LoadConfigOptions = LoadModuleOptions & {
  verbose?: boolean;
  overrides?: Partial<ConfigDeclaration>;
};

export const CONFIG_FILE_BASENAME = 'config.t';

export type StripDefaults<T extends InquirableZodType> = T extends InquirablePrimitive
  ? T
  : T extends InquirableZodObject
  ? { [k in keyof T]: T[k] extends z.ZodDefault<z.ZodTypeAny> ? z.ZodTypeAny : z.ZodTypeAny }
  : T;

export const unDefault = <T extends InquirableZodType = InquirableZodType>(shape: T): InquirableZodType => {
  if (shape instanceof z.ZodIntersection) {
    return z.intersection(unDefault(shape._def.left), unDefault(shape._def.right));
  } else if (shape instanceof z.ZodEffects) {
    const inner = shape.innerType();
    const undefaulted = unDefault(inner);
    return undefaulted;
  } else {
    const undefshape = { ...shape._def.shape() };
    for (const i in undefshape) {
      const val = undefshape[i];
      undefshape[i] = val instanceof z.ZodDefault ? val?.removeDefault() : val;
    }
    return z.object(undefshape);
  }
};

export const forceFilter = <TInput>(filter?: Filter<TInput>, input?: TInput) => {
  return (typeof filter === 'function' ? filter({ ...(input ?? ({} as any)) }) : filter) ?? [];
};

export const mergeConfigs = (a: ConfigDeclaration, b: ConfigDeclaration) => {
  const { include, exclude } = b;
  const merged = {
    ...a,
    ...b
  };
  if (include?.length || a.include?.length) {
    if (typeof a.include === 'function' || typeof include === 'function') {
      merged.include = (input: any) => [...forceFilter(a.include, input), ...forceFilter(include, input)];
    } else {
      merged.include = [...(a.include ?? []), ...(include ?? [])];
    }
  }
  if (exclude?.length || a.exclude?.length) {
    if (typeof a.exclude === 'function' || typeof exclude === 'function') {
      merged.exclude = (input: any) => [...forceFilter(a.exclude, input), ...forceFilter(exclude, input)];
    } else {
      merged.exclude = [...(a.exclude ?? []), ...(exclude ?? [])];
    }
  }
  return merged as ConfigDeclaration;
};

export const prettyConfig = (o?: ConfigDeclaration): any => {
  if (!o) {
    return o;
  }
  const { inputShape, inherits, ...rest } = o;
  return {
    ...rest,
    inputShape: inputShape ? '[ZodObject]' : undefined,
    inherits: prettyConfig(inherits)
  };
};

export const loadConfig = async (
  templateDirectory: string,
  options?: LoadConfigOptions
): Promise<ConfigDeclaration<any, any>> => {
  const tsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.ts');
  const jsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.js');
  const { verbose } = { verbose: false, ...options };
  const debug = logger(!!verbose);
  try {
    const module = (await safeLoadModule(tsName, options))?.module ?? (await safeLoadModule(jsName, options))?.module;
    const config = { ...module?.default };
    return config;
  } catch (err: any) {
    if (verbose) {
      console.warn('exception while loading template config:\n' + err.toString());
    }
    debug('default config', prettyConfig(defaultConfig));
    return defaultConfig;
  }
};
