//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';

import { ProtoCodec } from '@dxos/codec-protobuf';
import { ConfigProto } from '@dxos/config';

export const parseYamlWithSchema = <T>(codec: ProtoCodec<T>, yamlSource: string): T => {
  return codec.fromObject(yaml.load(yamlSource));
};

export const loadConfig = (configFilepath: string): ConfigProto =>
  yaml.load(fs.readFileSync(configFilepath).toString()) as ConfigProto;
