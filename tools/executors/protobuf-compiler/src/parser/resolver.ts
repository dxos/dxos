//
// Copyright 2020 DXOS.org
//

import { existsSync } from 'fs';
import { basename, dirname, join } from 'path';
import pb from 'protobufjs';

export type ProtoResolver = (origin: string, target: string) => string | null;

/**
 * Custom proto file resolver.
 */
export function createProtoResolver(
  original: ProtoResolver,
  baseDir?: string
): ProtoResolver {
  // NOTE: Must be function to preserve `this`.
  return function (this: any, origin, target) {
    // NOTE: Resolves `google.protobuf.any.proto`, etc.
    const classicResolved = original.call(this, origin, target);
    if (classicResolved && existsSync(classicResolved)) {
      return classicResolved;
    }

    try {
      // Test if referenced package.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const config = require(join(target, 'package.json'));
      if (typeof config.protobuf !== 'string') {
        throw new Error(`Package "${target}" does not expose "protobuf" file.`);
      }

      return require.resolve(join(target, config.protobuf));
    } catch {
      // https://nodejs.org/api/modules.html#requireresolverequest-options
      if (target.startsWith('./')) {
        return require.resolve(target, { paths: [dirname(origin)] });
      } else {
        // Convert to relative.
        if (!baseDir) {
          throw new Error('Base dir must be set for non-relative imports.');
        }

        const dir = join(baseDir, dirname(target));
        return require.resolve(`./${basename(target)}`, { paths: [dir] });
      }
    }
  };
}

export const registerResolver = (baseDir?: string) => {
  pb.Root.prototype.resolvePath = createProtoResolver(
    pb.Root.prototype.resolvePath,
    baseDir
  );
};
