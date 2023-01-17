//
// Copyright 2022 DXOS.org
//
import flatten from 'lodash.flatten';
import * as path from 'path';
import readDir from 'recursive-readdir';

import { loadConfig, unDefault, prettyConfig, ConfigDeclaration } from './config';
import {
  executeFileTemplate,
  TemplatingResult,
  isTemplateFile,
  LoadTemplateOptions,
  TemplateResultMetadata
} from './executeFileTemplate';
import { File } from './file';
import { filterIncludeExclude } from './util/filterIncludeExclude';
import { logger } from './util/logger';
import { runPromises } from './util/runPromises';
import { inquire } from './util/zodInquire';

export type DirectoryTemplateOptions<TInput> = {
  templateDirectory: string;
  outputDirectory?: string;
  input?: Partial<TInput>;
  parallel?: boolean;
  verbose?: boolean;
  overwrite?: boolean;
  interactive?: boolean;
  executeFileTemplates?: boolean;
  inheritance?: boolean;
  printMessage?: boolean;
};

export type ExecuteDirectoryTemplateOptions<TInput> = LoadTemplateOptions &
  ConfigDeclaration &
  DirectoryTemplateOptions<TInput>;

export const executeDirectoryTemplate = async <TInput>(
  options: ExecuteDirectoryTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const { templateDirectory } = options;
  const mergedOptions = {
    parallel: true,
    verbose: false,
    interactive: true,
    executeFileTemplates: true,
    inheritance: true,
    outputDirectory: process.cwd(),
    overwrite: false,
    printMessage: true,
    ...options,
    ...(await loadConfig(templateDirectory, { verbose: options?.verbose, overrides: options }))
  };
  const {
    parallel,
    verbose,
    inherits,
    interactive,
    overwrite,
    inputShape,
    include,
    exclude,
    inheritance,
    executeFileTemplates,
    outputDirectory,
    printMessage,
    message,
    ...restOptions
  } = mergedOptions;
  const debug = logger(verbose);
  const info = logger(true);
  if (!outputDirectory) {
    throw new Error('an output directory is required');
  }
  debug(`executing template ${templateDirectory}`);
  debug(prettyConfig(mergedOptions));
  let input = mergedOptions.input;
  if (inputShape && executeFileTemplates) {
    if (interactive) {
      const parse = unDefault(inputShape).safeParse(input);
      if (!parse.success) {
        const inquired = await inquire(inputShape, {
          defaults: input
        });
        const inquiredParsed = inputShape.safeParse(inquired);
        if (!inquiredParsed.success) {
          throw new Error('invalid input: ' + inquiredParsed.error.toString());
        }
        input = inquiredParsed.data as TInput;
      } else {
        const parseWithEffects = inputShape.safeParse(input);
        if (!parse.success) {
          throw new Error('invalid input: ' + parseWithEffects.error.toString());
        }
        input = parse.data as TInput;
      }
    } else {
      const parse = inputShape.safeParse(input);
      if (!parse.success) {
        throw new Error('invalid input: ' + parse.error.toString());
      }
      input = parse.data as TInput;
    }
  }
  debug('inputs:', input);
  inherits && debug(`executing inherited template ${inherits?.templateDirectory}`);
  const inherited =
    inherits && inheritance
      ? await inherits.execute({
          ...options,
          interactive: false,
          executeFileTemplates,
          input,
          printMessage: false
        })
      : undefined;
  const allFiles = await readDir(
    templateDirectory,
    (exclude ?? []).map((x) => (x instanceof RegExp ? (entry) => x.test(entry.replace(templateDirectory, '')) : x))
  );
  debug(`${allFiles.length} files discovered`);
  const filteredFiles = filterIncludeExclude(allFiles, {
    include,
    exclude,
    transform: (s) => s.replace(templateDirectory, '').replace(/^\//, '')
  });
  debug(`${filteredFiles.length}/${allFiles.length} files included`);
  const ignoredFiles = allFiles.filter((f) => filteredFiles.indexOf(f) < 0);
  const templateFiles = executeFileTemplates ? filteredFiles.filter(isTemplateFile) : [];
  const regularFiles = filteredFiles.filter((file) => !isTemplateFile(file));
  debug(`${ignoredFiles.length} ignored files:`);
  debug(ignoredFiles.join('\n'));
  debug(`${templateFiles.length} template files:`);
  debug(templateFiles.join('\n'));
  debug(`${regularFiles.length} regular files:`);
  debug(regularFiles.join('\n'));
  debug(`executing ${templateFiles.length} template files ${parallel ? 'in parallel' : 'sequentially'}...`);
  const templatingPromises = templateFiles?.map((t) => {
    return executeFileTemplate({
      ...restOptions,
      outputDirectory,
      templateFile: path.relative(templateDirectory, t),
      templateRelativeTo: templateDirectory,
      input,
      overwrite
    });
  });
  const runner = runPromises({
    before: (_p, i) => {
      debug(`${templateFiles[Number(i)]} ....`);
    },
    after: (_p, i) => {
      debug(`${templateFiles[Number(i)]} done`);
    }
  });
  const templateOutputs = await (parallel
    ? runner.inParallel(templatingPromises)
    : runner.inSequence(templatingPromises));
  const stringPath = (p: string | string[]) => (typeof p === 'string' ? p : path.join(...p));
  const isWithinTemplateOutput = (f: string): boolean => {
    return templateOutputs.some((files) => files.some((file) => !!file && stringPath(file.path) === f));
  };
  const flatOutput = [
    ...regularFiles
      ?.filter((f) => !isWithinTemplateOutput(f))
      .map(
        (r) =>
          new File<string, TemplateResultMetadata>({
            path: path.join(outputDirectory, r.slice(templateDirectory.length).replace(/\/$/, '')),
            copyFrom: r,
            overwrite
          })
      ),
    ...flatten(templateOutputs)
  ].filter(Boolean);
  debug(`${flatOutput.length} templating results`);
  const inheritedOutputMinusFlatOutput = inherited
    ? inherited.filter((inheritedOut) => {
        return !flatOutput.find((existing) => existing.path === inheritedOut.path);
      })
    : [];
  const results = [...flatOutput, ...inheritedOutputMinusFlatOutput];
  if (printMessage) {
    const stack = [{ message, inherits }];
    while (stack[0].inherits) {
      const { message, inherits } = stack[0].inherits;
      stack.unshift({ message, inherits });
    }
    let msg = '';
    stack.forEach((template) => {
      const currentmsg = template?.message?.({
        ...mergedOptions,
        results,
        input: { ...input },
        inheritedMessage: msg
      });
      msg = currentmsg ?? msg;
    });
    if (msg) {
      info(msg);
    }
  }
  return results;
};
