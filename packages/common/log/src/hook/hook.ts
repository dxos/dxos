import { mkdirSync, writeFileSync } from 'fs';
import { dirname, extname, join, parse } from 'path';
import { addHook } from 'pirates';
import { getCurrentOwnershipScope } from '../ownership';
import { ID_BUGCHECK_STRING, ID_GET_CURRENT_OWNERSHIP_SCOPE, preprocess } from './preprocessor';

export function register() {
  addHook((code, filename) => {
    try {
      const output = preprocess(code, filename)

      const sourceMap = getSourceMap(filename)

      // Write code for debugging
      const path = join(process.cwd(), '.trace-compiled', filename)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, output.code, { encoding: 'utf-8' })
      writeFileSync(`${dirname(path)}/${parse(path).name}.orig${extname(path)}`, code, { encoding: 'utf-8' })
      if(sourceMap) {
        writeFileSync(`${dirname(path)}/${parse(path).name}.orig${extname(path)}.map`, sourceMap, { encoding: 'utf-8' })
      }

      return output.code
    } catch(err) {
      console.error(err)
      throw err
    }
  }, {
    extensions: ['.ts'],
  });

  function getSourceMap(filename: string): string | undefined {
    try {
      const { retrieveSourceMap } = require('source-map-support')
      const sourceMap = retrieveSourceMap(filename)
      if(sourceMap) {
        return typeof sourceMap.map === 'string' ? sourceMap.map : JSON.stringify(sourceMap.map)
      }
    } catch(err) {}

    try {
      const { SourcemapMap } = require('@swc-node/sourcemap-support')
      const sourceMap = SourcemapMap.get(filename)
      if(sourceMap) {
        return sourceMap
      }
    } catch(err) {}

    return undefined;
  }

  registerGlobals()
}

const BUGCHECK_STRING = 'If you see this messages then it means that the source code preprocessor for @dxos/log is broken.'
+ ' It probably has misinterpreted an unrelated call for a logger invocation.';

function registerGlobals() {
  (globalThis as any)[ID_GET_CURRENT_OWNERSHIP_SCOPE] = getCurrentOwnershipScope;
  (globalThis as any)[ID_BUGCHECK_STRING] = BUGCHECK_STRING;
}