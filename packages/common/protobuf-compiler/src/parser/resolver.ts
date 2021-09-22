//
// Copyright 2020 DXOS.org
//

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import pb from 'protobufjs';

export type ProtoResolver = (origin: string, target: string) => string | null;

export function createProtoResolver (original: ProtoResolver): ProtoResolver {
  return function (this: any, origin, target) {
    const clasicResolved = original.call(this, origin, target);
    if (clasicResolved && existsSync(clasicResolved)) {
      return clasicResolved;
    }

    let config: any;
    try {
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
export function registerResolver () {
  pb.Root.prototype.resolvePath = resovler;
}
