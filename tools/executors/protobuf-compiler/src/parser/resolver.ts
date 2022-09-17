//
// Copyright 2020 DXOS.org
//

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import pb from 'protobufjs';

export type ProtoResolver = (origin: string, target: string) => string | null;

/**
 * Custom proto file resolver.
 */
export function createProtoResolver (original: ProtoResolver, baseDir?: string): ProtoResolver {
  return function (this: any, origin, target) {
    // console.log(target);
    // TODO(burdon): Resolve FQ names (from current root).

    const classicResolved = original.call(this, origin, target);
    if (classicResolved && existsSync(classicResolved)) {
      return classicResolved;
    }

    let config: any;
    try {
      // Test if referenced package.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      config = require(join(target, 'package.json'));
    } catch {
      config = undefined;
    }

    if (config) {
      if (typeof config.protobuf !== 'string') {
        throw new Error(`Package "${target}" does not expose "protobuf" file.`);
      }

      return require.resolve(join(target, config.protobuf), { paths: [dirname(origin)] });
    } else {
      return require.resolve(target, { paths: [dirname(origin)] });
    }
  };
}

const resovler = createProtoResolver(pb.Root.prototype.resolvePath);
export const registerResolver = () => {
  pb.Root.prototype.resolvePath = resovler;
};
