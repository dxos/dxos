//
// Copyright 2022 DXOS.org
//

import * as ts from 'typescript';

import { transformSourceFile } from './source-transformer';

type PluginOptions = {};

/**
 * TypeScript transformer that augments every log function with metadata.
 * Executed during the package build process.
 */
export const before = (pluginOptions: PluginOptions, program: ts.Program): ts.CustomTransformerFactory => {
  return (context) => {
    return {
      transformSourceFile: (sourceFile) => {
        return transformSourceFile(sourceFile, context);
      },

      transformBundle: (bundle) => bundle
    };
  };
};
