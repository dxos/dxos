//
// Copyright 2023 DXOS.org
//

import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import * as process from 'node:process';

import {
  EventType,
  FileType,
  MailboxType,
  MessageType,
  StackType,
  ThreadType,
  DocumentType,
  SectionType,
  ContactType,
  TextV0Type,
} from '@braneframe/types';
import { GameType } from '@dxos/chess-app/types';
import { type Space } from '@dxos/client/echo';
import { Config } from '@dxos/config';
import type { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

export const str = (...text: (string | undefined | boolean)[]): string => text.filter(Boolean).flat().join('\n');

export const toArray = <T>(value?: T | T[] | undefined, defValue = undefined): T[] | undefined =>
  value === undefined || value === null ? defValue : Array.isArray(value) ? value : [value];

export const loadJson = (filename: string) => {
  invariant(filename, 'Invalid path');
  return yaml.load(String(fs.readFileSync(path.join(process.cwd(), filename)))) as any;
};

export const stringMatch = (text: string, prefix = false) => {
  const match = text.toLowerCase();
  return prefix
    ? (value: string) => value.toLowerCase().indexOf(match) !== -1
    : (value: string) => value.toLowerCase() === match;
};

export const getYaml = <T>(filename: string): T | undefined => {
  if (fs.existsSync(filename)) {
    return yaml.load(String(fs.readFileSync(filename))) as T;
  }
};

export const getConfig = (
  filename = process.env.TEST_CONFIG ?? path.join(process.env.HOME!, '.config/dx/profile/default.yml'),
): Config | undefined => {
  if (fs.existsSync(filename)) {
    return new Config(yaml.load(String(fs.readFileSync(filename))) as any);
  }
};

export const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

export const registerTypes = (space: Space | undefined) => {
  if (!space) {
    return;
  }
  const registry = space.db.graph.schemaRegistry;
  const schemaList: S.Schema<any>[] = [
    MessageType,
    MailboxType,
    GameType,
    SectionType,
    StackType,
    DocumentType,
    ThreadType,
    EventType,
    FileType,
    ContactType,
    TextV0Type,
  ];
  for (const type of schemaList) {
    if (!registry.isSchemaRegistered(type)) {
      registry.registerSchema(type);
    }
  }
};
