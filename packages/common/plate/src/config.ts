import path from 'path';
import { LoadModuleOptions, safeLoadModule } from './loadModule';
import { TEMPLATE_FILE_IGNORE } from './executeFileTemplate';
import { InquirableZodType, InquirableZodObject, InquirablePrimitive } from './zodInquire';
import { z } from 'zod';

export type Config<TInput extends InquirableZodType = InquirableZodType> = {
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
  inputShape?: TInput;
  inherits?: string;
};

const exclude = [/\/.t\//, ...TEMPLATE_FILE_IGNORE];

export const defaultConfig: Config = {
  exclude
};

export type LoadConfigOptions = LoadModuleOptions & {
  verbose?: boolean;
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
  } else {
    const undefshape = { ...shape._def.shape() };
    for (let i in undefshape) {
      const val = undefshape[i];
      undefshape[i] = val instanceof z.ZodDefault ? val?.removeDefault() : val;
    }
    return z.object(undefshape);
  }
};

export const mergeConfigs = (a: Config, b: Config) => {
  const { include, exclude } = b;
  const merged = {
    ...a,
    ...b
  };
  if (include?.length) merged.include = [...(a.include ?? []), ...include];
  if (exclude?.length) merged.exclude = [...(a.exclude ?? []), ...exclude];
  return merged as Config;
};

export const loadConfig = async (templateDirectory: string, options?: LoadConfigOptions): Promise<Config> => {
  const tsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.ts');
  const jsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.js');
  const { verbose } = { ...options };
  try {
    const module = (await safeLoadModule(tsName, options))?.module ?? (await safeLoadModule(jsName, options))?.module;
    const config = { ...module?.default };
    const inherited = config.inherits
      ? await loadConfig(path.resolve(templateDirectory, config.inherits), options)
      : undefined;
    return mergeConfigs(defaultConfig, inherited ? mergeConfigs(inherited, config) : config);
  } catch (err: any) {
    if (verbose) console.warn('exception while loading template config:\n' + err.toString());
    return defaultConfig;
  }
};

export const defineConfig = <I extends InquirableZodType = InquirableZodType>(config: Config<I>) => config;
