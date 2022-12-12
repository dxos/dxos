//
// Copyright 2022 DXOS.org
//
import flatten from 'lodash.flatten';
import * as path from 'path';
import readDir from 'recursive-readdir';

import { Config, loadConfig, unDefault, prettyConfig } from './config';
import {
  executeFileTemplate,
  TemplatingResult,
  isTemplateFile,
  LoadTemplateOptions,
  TemplateResultMetadata
} from './executeFileTemplate';
import { File } from './file';
import { includeExclude } from './util/includeExclude';
import { logger } from './util/logger';
import { runPromises } from './util/runPromises';
import { inquire } from './util/zodInquire';

export type ExecuteDirectoryTemplateOptions<TInput> = LoadTemplateOptions &
  Config & {
    templateDirectory: string;
    outputDirectory: string;
    input?: Partial<TInput>;
    parallel?: boolean;
    verbose?: boolean;
    overwrite?: boolean;
    interactive?: boolean;
  };

export const executeDirectoryTemplate = async <TInput>(
  options: ExecuteDirectoryTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const { templateDirectory, outputDirectory } = options;
  const mergedOptions = {
    parallel: true,
    verbose: false,
    interactive: true,
    ...options,
    ...(await loadConfig(templateDirectory, { verbose: options?.verbose, overrides: options }))
  };
  const { parallel, verbose, inherits, interactive, overwrite, inputShape, include, exclude, ...restOptions } =
    mergedOptions;
  const debug = logger(verbose);
  debug(`executing template ${templateDirectory}`);
  debug(prettyConfig(mergedOptions));
  let input = mergedOptions.input;
  if (inputShape) {
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
  inherits && debug(`executing inherited template ${inherits}`);
  const inherited = inherits
    ? await executeDirectoryTemplate({
        ...options,
        templateDirectory: path.resolve(templateDirectory, inherits),
        interactive: false,
        input
      })
    : undefined;
  const allFiles = await readDir(
    templateDirectory,
    (exclude ?? []).map((x) => (x instanceof RegExp ? (entry) => x.test(entry) : x))
  );
  const filteredFiles = includeExclude(allFiles, {
    include,
    exclude,
    transform: (s) => s.replace(templateDirectory, '').replace(/^\//, '')
  });
  const ignoredFiles = allFiles.filter((f) => filteredFiles.indexOf(f) < 0);
  const templateFiles = filteredFiles.filter(isTemplateFile);
  const regularFiles = filteredFiles.filter((file) => !isTemplateFile(file));
  debug(`${ignoredFiles.length} ignored files:`);
  debug(ignoredFiles.join('\n'));
  debug(`${templateFiles.length} template files:`);
  debug(templateFiles.join('\n'));
  debug(`${regularFiles.length} regular files:`);
  debug(regularFiles.join('\n'));
  debug(`getting ready to execute ${templateFiles.length} template files ...`);
  const templatingPromises = templateFiles?.map((t) => {
    const templateFile = path.relative(templateDirectory, t);
    const result = executeFileTemplate({
      ...restOptions,
      templateFile,
      templateRelativeTo: templateDirectory,
      input,
      // inherited: inherits ? inherited?.filter((result) => result.metadata.templateFile === templateFile) : undefined,
      overwrite
    });
    return result;
  });
  const runner = runPromises({
    before: (_p, i) => {
      debug(`${templateFiles[Number(i)]} ....`);
    },
    after: (_p, i) => {
      debug(`${templateFiles[Number(i)]} done`);
    }
  });
  debug(`executing template files ${parallel ? 'in parallel' : 'sequentially'} ...`);
  const templateOutputs = await (parallel
    ? runner.inParallel(templatingPromises)
    : runner.inSequence(templatingPromises));
  const stringPath = (p: string | string[]) => (typeof p === 'string' ? p : path.join(...p));
  const isWithinTemplateOutput = (f: string): boolean => {
    return templateOutputs.some((files) => files.some((file) => !!file && stringPath(file.path) === f));
  };
  debug(`template files executed : ${templateDirectory}`);
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
  ];
  const inheritedOutputMinusFlatOutput = inherited
    ? inherited.filter((inheritedOut) => {
        return !flatOutput.find((existing) => existing.path === inheritedOut.path);
      })
    : flatOutput;
  return [...flatOutput, ...inheritedOutputMinusFlatOutput];
};
