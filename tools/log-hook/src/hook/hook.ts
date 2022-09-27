//
// Copyright 2022 DXOS.org
//

import { SourcemapMap } from '@swc-node/sourcemap-support';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, extname, join, parse } from 'path';
import { addHook } from 'pirates';
import { loadSync } from 'sorcery';

import { ID_BUGCHECK_STRING, ID_GET_CURRENT_OWNERSHIP_SCOPE, preprocess } from './preprocessor';

// TODO(dmaretskyi): Move to separate package in tools.

// Here be dragons.
export const register = () => {
  addHook((code, filename) => {
    try {
      const output = preprocess(code, filename);
      if (output.map) {
        SourcemapMap.set(filename, output.map);
      }

      // Dump code for debugging
      const DUMP = false;
      if (DUMP) {
        const sourceMap = getSourceMap(filename);
        const path = join(process.cwd(), '.trace-compiled', filename);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, output.code, { encoding: 'utf-8' });
        writeFileSync(`${dirname(path)}/${parse(path).name}.orig${extname(path)}`, code, { encoding: 'utf-8' });
        if (sourceMap) {
          writeFileSync(`${dirname(path)}/${parse(path).name}.orig${extname(path)}.map`, sourceMap!, { encoding: 'utf-8' });
        }
      }

      return output.code;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, {
    extensions: ['.ts']
  });

  const getSourceMap = (filename: string): string | undefined => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { retrieveSourceMap } = require('source-map-support');
      const sourceMap = retrieveSourceMap(filename);
      if (sourceMap) {
        return typeof sourceMap.map === 'string' ? sourceMap.map : JSON.stringify(sourceMap.map);
      }
    } catch (err) {}

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SourcemapMap } = require('@swc-node/sourcemap-support');
      const sourceMap = SourcemapMap.get(filename);
      if (sourceMap) {
        return sourceMap;
      }
    } catch (err) {}

    return undefined;
  };

  registerGlobals();

  patchSourceMaps();
};

const BUGCHECK_STRING = 'FOO If you see this message then it means that the source code preprocessor for @dxos/log is broken.' +
' It probably has misinterpreted an unrelated call for a logger invocation.';

const registerGlobals = () => {
  (globalThis as any)[ID_GET_CURRENT_OWNERSHIP_SCOPE] = () => null;// getCurrentOwnershipScope;
  (globalThis as any)[ID_BUGCHECK_STRING] = BUGCHECK_STRING;
};

/**
 * Patches @swc-node/sourcemap-support to combine source maps from multiple compilation steps.
 *
 * We have two compilation steps: the logger preprocessor that inserts log metadata,
 * and the SWC TS to JS compiler.
 * There's a bug in SWC which makes it ignore the input source map from the previous compilation step.
 *
 * The source maps get put into the SourcemapMap from @swc-node/sourcemap-support.
 * We patch the set method to check if there's already a source map from the previous compilation step,
 * and combine then together.
 */
function patchSourceMaps () {
  const orig = SourcemapMap.set;
  SourcemapMap.set = function (this: typeof SourcemapMap, key: string, value: string) {
    if (SourcemapMap.get(key)) {
      return orig.call(this, key, combineSourceMaps(SourcemapMap.get(key), value));
    } else {
      return orig.call(this, key, value);
    }
  } as any;
}

/**
 * Combines two source maps for the same file and outputs a new source map.
 *
 * @param prevMap Source map from the first compilation step.
 * @param newMap Source map from the second compilation step.
 */
const combineSourceMaps = (prevMap: string, nextMap: string) => {
  const prev = JSON.parse(prevMap);
  const newMap = JSON.parse(nextMap);

  newMap.sources[0] = '/prev';
  const generated = loadSync('/new', {
    content: {
      '/new': newMap.sourcesContent[0],
      '/prev': prev.sourcesContent[0]
    },
    sourcemaps: {
      '/new': newMap,
      '/prev': prev
    }
  }).apply();

  generated.sources[0] = '/' + generated.sources[0];

  return JSON.stringify(generated);
};
