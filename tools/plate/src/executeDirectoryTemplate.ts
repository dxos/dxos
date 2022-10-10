//
// Copyright 2022 DXOS.org
//

import flatten from 'lodash.flatten';
import * as path from 'path';
import readDir from 'recursive-readdir';

import {
  executeFileTemplate,
  TemplatingResult,
  isTemplateFile
} from './executeFileTemplate.js';
import { File } from './file/index.js';

export type ExecuteDirectoryTemplateOptions<TInput> = {
  templateDirectory: string
  outputDirectory: string
  input?: Partial<TInput>
};

export const executeDirectoryTemplate = async <TInput>(
  options: ExecuteDirectoryTemplateOptions<TInput>
): Promise<TemplatingResult> => {
  const { templateDirectory, outputDirectory, input } = options;
  const allFiles = await readDir(templateDirectory);
  const templateFiles = allFiles.filter(isTemplateFile);
  const regularFiles = allFiles.filter((file) => !isTemplateFile(file));
  const templateOutputs = await Promise.all(
    templateFiles?.map((t) =>
      executeFileTemplate({
        templateFile: path.relative(templateDirectory, t),
        templateRelativeTo: templateDirectory,
        outputDirectory,
        input
      })
    )
  );
  const stringPath = (p: string | string[]) =>
    typeof p === 'string' ? p : path.join(...p);
  const isOverwrittenByTemplateOutput = (f: string): boolean => {
    return templateOutputs.some((files) =>
      files.some((file) => stringPath(file.path) === f)
    );
  };
  return [
    ...regularFiles
      ?.filter((f) => !isOverwrittenByTemplateOutput(f))
      .map(
        (r) =>
          new File({
            path: path.join(outputDirectory, r.slice(templateDirectory.length)),
            copyFrom: r
          })
      ),
    ...flatten(templateOutputs)
  ];
};
