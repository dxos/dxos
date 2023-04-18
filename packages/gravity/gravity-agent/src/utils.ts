//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';

import { ProtoCodec } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { schema } from '@dxos/protocols';

export const parseYamlWithSchema = <T>(codec: ProtoCodec<T>, yamlSource: string): T => {
  return codec.fromObject(yaml.load(yamlSource));
};

export const loadConfig = (configFilepath: string): Config =>
  new Config(
    parseYamlWithSchema(schema.getCodecForType('dxos.config.Config'), fs.readFileSync(configFilepath).toString())
  );
