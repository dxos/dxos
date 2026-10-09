//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const VLQ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VLQ_INDEX = new Map([...VLQ].map((character, index) => [character, index]));

/** `[generatedColumn, sourceIndex, sourceLine, nameIndex]`; `nameIndex` is -1 where the segment has none. */
type Segment = [number, number, number, number];

/** Per generated line, its segments sorted by column. */
export const decodeMappings = (mappings: string): Segment[][] => {
  const lines: Segment[][] = [];
  let sourceIndex = 0;
  let sourceLine = 0;
  let nameIndex = 0;
  for (const raw of mappings.split(';')) {
    const segments: Segment[] = [];
    let generatedColumn = 0;
    for (const segment of raw.split(',')) {
      if (!segment) {
        continue;
      }
      const values: number[] = [];
      let value = 0;
      let shift = 0;
      for (const character of segment) {
        const digit = VLQ_INDEX.get(character);
        if (digit === undefined) {
          break;
        }
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          values.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      generatedColumn += values[0] ?? 0;
      if (values.length >= 4) {
        sourceIndex += values[1];
        sourceLine += values[2];
        if (values.length >= 5) {
          nameIndex += values[4];
        }
        segments.push([generatedColumn, sourceIndex, sourceLine, values.length >= 5 ? nameIndex : -1]);
      }
    }
    segments.sort((left, right) => left[0] - right[0]);
    lines.push(segments);
  }
  return lines;
};

/** The workspace package a source path belongs to, or the npm package for a dependency. */
export const packageOf = (source: string): string => {
  const modules = source.lastIndexOf('node_modules/');
  if (modules >= 0) {
    const rest = source.slice(modules + 'node_modules/'.length).replace(/^\.pnpm\/[^/]+\/node_modules\//, '');
    const [scope, name] = rest.split('/');
    return scope.startsWith('@') ? `${scope}/${name}` : scope;
  }
  const match = source
    .replace(/^(\.\.\/)+/, '')
    .replace(/^packages\//, '')
    .match(
      /^(?:plugins|common|core|sdk|ui|devtools|tools|apps|experimental|e2e)\/(?:[a-z0-9-]+\/)*?([a-z0-9-]+)\/(?:src|dist)\//,
    );
  return match ? `@dxos/${match[1]}` : '(app)';
};

export type SourceFrame = { package: string; source: string; line: number; name?: string };

type LoadedMap = { lines: Segment[][]; sources: string[]; names: string[] };

const isRawMap = (value: unknown): value is { mappings: string; sources: string[]; names?: string[] } =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'mappings') === 'string' &&
  Array.isArray(Reflect.get(value, 'sources'));

export type FrameResolverOptions = {
  /** Where the maps' relative `sources` were written from, when the chunks have since been copied elsewhere. */
  sourceBase?: string;
  /** Sources are reported relative to this, so they match `git diff` paths. */
  workspaceRoot?: string;
};

/**
 * Maps a 1-based line and 0-based column in a built chunk back to the source that wrote it, using
 * the `<chunk>.map` beside the chunk in `assetsDir`. A chunk without a map resolves to undefined.
 */
export const createFrameResolver = (
  assetsDir: string,
  { sourceBase = assetsDir, workspaceRoot }: FrameResolverOptions = {},
): ((script: string, line: number, column: number) => SourceFrame | undefined) => {
  const cache = new Map<string, LoadedMap | undefined>();
  const load = (script: string): LoadedMap | undefined => {
    const base = script.split('/').pop()?.split('?')[0];
    if (!base) {
      return undefined;
    }
    if (!cache.has(base)) {
      const file = path.join(assetsDir, `${base}.map`);
      const raw: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
      cache.set(
        base,
        isRawMap(raw)
          ? { lines: decodeMappings(raw.mappings), sources: raw.sources, names: raw.names ?? [] }
          : undefined,
      );
    }
    return cache.get(base);
  };
  return (script, line, column) => {
    const map = load(script);
    if (!map) {
      return undefined;
    }
    let found: Segment | undefined;
    for (const segment of map.lines[Math.max(0, line - 1)] ?? []) {
      if (segment[0] > column) {
        break;
      }
      found = segment;
    }
    if (!found) {
      return undefined;
    }
    const [, sourceIndex, sourceLine, nameIndex] = found;
    const raw = map.sources[sourceIndex] ?? '';
    const source = workspaceRoot
      ? path.relative(workspaceRoot, path.resolve(sourceBase, raw))
      : raw.replace(/^(\.\.\/)+/, '');
    return {
      package: packageOf(source),
      source,
      line: sourceLine + 1,
      ...(nameIndex >= 0 ? { name: map.names[nameIndex] } : {}),
    };
  };
};
