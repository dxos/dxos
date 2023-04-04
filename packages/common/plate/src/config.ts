//
// Copyright 2022 DXOS.org
//

import callsite from 'callsite';
import path from 'node:path';
import { z } from 'zod';

import {
  executeDirectoryTemplate,
  DirectoryTemplateOptions,
  ExecuteDirectoryTemplateOptions,
  CompleteExecuteDirectoryTemplateOptions,
  DirectoryTemplateResult
} from './executeDirectoryTemplate';
import { TEMPLATE_FILE_IGNORE, Files } from './executeFileTemplate';
import { LoadModuleOptions, safeLoadModule } from './util/loadModule';
import { logger } from './util/logger';
import { InquirableZodType, InquirableZodObject, InquirablePrimitive, QuestionOptions } from './util/zodInquire';

export { QuestionOptions };

export type FilterExpression = string | RegExp;

export type Filter<TInput = any> = FilterExpression[] | ((input: TInput) => FilterExpression[]);

export type ShellScripts = {
  after?: string[];
};

export type ConfigDeclaration<TShape extends InquirableZodType = InquirableZodType, TInput = z.infer<TShape>> = {
  inherits?: ConfigDefinition<InquirableZodType, any>;
  include?: Filter<TInput>;
  exclude?: Filter<TInput>;
  inputShape?: TShape;
  inputQuestions?: QuestionOptions<TInput>;
  defaults?: Partial<TInput>;
  prepareContext?: (
    context: CompleteExecuteDirectoryTemplateOptions<TInput>
  ) => CompleteExecuteDirectoryTemplateOptions<TInput>;
  events?: {
    after?: (context: { results: Files; input: TInput; outputDirectory: string }) => Promise<any> | any;
  };
  message?: (
    context: Required<DirectoryTemplateOptions<TInput>> & {
      results: Files;
      inheritedMessage?: string;
    },
  ) => string;
};

export type ConfigDefinition<
  TShape extends InquirableZodType = InquirableZodType,
  TInput = z.infer<TShape>
> = ConfigDeclaration<TShape, TInput> & {
  templateDirectory: string;
  execute(options?: ExecuteSpecificDirectoryTemplateOptions<TInput>): Promise<DirectoryTemplateResult>;
};

export type ExecuteSpecificDirectoryTemplateOptions<TInput> = Omit<
  ExecuteDirectoryTemplateOptions<TInput>,
  'templateDirectory'
>;

export const defineConfig = <TShape extends InquirableZodType = InquirableZodType, TInput = z.infer<TShape>>(
  config: ConfigDeclaration<TShape, TInput>
): ConfigDefinition<TShape, TInput> => {
  const stack = callsite();
  const requester = stack[1].getFileName();
  const templateDirectory = path.dirname(requester);
  const merged = [defaultConfig, config?.inherits ?? {}, config].reduce(
    // TODO(zhenyasav): remove these any casts
    (memo, next) => (next ? mergeConfigs(memo as any, next as any) : memo),
    {},
  );
  return {
    // TODO(zhenyasav): remove this cast
    ...(merged as ConfigDefinition<TShape, TInput>),
    templateDirectory,
    execute: async (options?: ExecuteSpecificDirectoryTemplateOptions<TInput>) => {
      return executeDirectoryTemplate({
        ...(options as any),
        templateDirectory
      });
    },
  };
};

const exclude = [/\.t\//, /node_modules/, ...TEMPLATE_FILE_IGNORE];

export const defaultConfig: ConfigDeclaration = {
  exclude,
};

export type LoadConfigOptions = LoadModuleOptions & {
  verbose?: boolean;
  overrides?: Partial<ConfigDeclaration<InquirableZodType, any>>;
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

export const forceFilter = <TInput>(filter?: Filter<TInput>, input?: Partial<TInput>) => {
  return (typeof filter === 'function' ? filter({ ...(input ?? ({} as any)) }) : filter) ?? [];
};

export const mergeConfigs = (a: ConfigDeclaration, b: ConfigDeclaration) => {
  const { include, exclude } = b;
  const merged = {
    ...a,
    ...b,
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

export const prettyConfig = (o?: ConfigDeclaration<InquirableZodType, any>): any => {
  if (!o) {
    return o;
  }
  const { inputShape, inherits, ...rest } = o;
  return {
    ...rest,
    inputShape: inputShape ? '[ZodObject]' : undefined,
    inherits: prettyConfig(inherits),
  };
};

export const loadConfig = async (
  templateDirectory: string,
  options?: LoadConfigOptions
): Promise<ConfigDeclaration<InquirableZodType, any>> => {
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
