//
// Copyright 2026 DXOS.org
//

import { posix } from 'node:path';

import { globPattern } from '../../internal/glob.ts';
import * as Mdl from '../../Mdl.ts';
import * as Ontology from '../../Ontology.ts';
import { type AnalyzeContext, fileNode } from './common.ts';

/**
 * `.mdl` documents: the frontmatter and Extensions table on the File, then one `SpecBlock` per block
 * with its fields as a tree. Classifying blocks and linking them to code is a reasoner's job.
 */

// Block types whose second header token names the thing described rather than labelling the block.
const NAMED_BLOCKS = new Set(['module', 'type', 'service', 'component', 'op', 'ext', 'flow', 'skill', 'capability']);

/** `<scope>:<target>[#<fragment>]` — the reference syntax of `core.mdl` (`markdown:QA-1`). */
const REFERENCE = /^([A-Za-z][\w.@-]*):([^\s:#/][^\s#]*)(?:#(.+))?$/;

/** The frontmatter keys with a property of their own; any other is kept as `key=value`. */
const FRONTMATTER = new Set(['id', 'name', 'version', 'extends']);

const asList = (value: string | readonly string[] | undefined): string[] =>
  value === undefined ? [] : typeof value === 'string' ? [value] : [...value];

const globNode = (glob: string): Ontology.FileGlobNode => ({
  '@id': Ontology.globIri(glob).value,
  '@type': 'FileGlob',
  glob,
  'pathPattern': globPattern(glob),
});

/** A `files` value resolved both ways; the `rule` block's `scope` decides which applies, in a rule. */
const globsOf = (value: string, dir: string): Pick<Ontology.SpecFieldNode, 'repoGlob' | 'dirGlob'> => {
  const glob = value.replace(/^\.\//, '').replace(/^\//, '');
  const local = posix.normalize(posix.join(dir, glob));
  return {
    repoGlob: globNode(glob),
    // A glob climbing out of the repository names nothing the index holds.
    ...(local.startsWith('../') ? {} : { dirGlob: globNode(local) }),
  };
};

const fieldNodes = (
  fields: readonly Mdl.Field[],
  block: string,
  parentPath: string | undefined,
  dir: string,
  inFiles: boolean,
): Ontology.SpecFieldNode[] =>
  fields.map((field) => {
    const segment = field.key ?? String(field.index);
    const path = parentPath === undefined ? segment : `${parentPath}.${segment}`;
    const reference = field.value?.match(REFERENCE);
    const files = field.key === 'files' || (inFiles && field.key === undefined);
    const children = fieldNodes(field.fields, block, path, dir, field.key === 'files');
    return {
      '@id': Ontology.specFieldIri(block, path).value,
      '@type': 'SpecField',
      ...(field.key !== undefined ? { key: field.key } : {}),
      ...(field.index !== undefined ? { index: field.index } : {}),
      'fieldPath': path,
      ...(field.value !== undefined ? { value: field.value } : {}),
      ...(field.optional ? { optional: true } : {}),
      'line': field.line,
      ...(reference
        ? {
            refScope: reference[1],
            refTarget: reference[2],
            ...(reference[3] ? { refFragment: reference[3].trim() } : {}),
          }
        : {}),
      ...(files && field.value !== undefined && !/\s/.test(field.value) ? globsOf(field.value, dir) : {}),
      ...(children.length > 0 ? { hasField: children } : {}),
    };
  });

export const analyzeMdl = (context: AnalyzeContext): Ontology.FileDocument => {
  const base = fileNode(context);
  const document = Mdl.parse(context.source);
  const dir = posix.dirname(context.path.replaceAll('\\', '/'));
  const seen = new Map<string, number>();
  const iris = new Map<Mdl.Block, string>();
  const blocks = Mdl.flatten(document.blocks).map(({ block, parent }): Ontology.SpecBlockNode => {
    const named = NAMED_BLOCKS.has(block.type);
    const key = block.id ?? block.title ?? `${block.line}`;
    // Two blocks of one type may share a key (`test` cases, unnamed features); disambiguate in order.
    const count = (seen.get(`${block.type}:${key}`) ?? 0) + 1;
    seen.set(`${block.type}:${key}`, count);
    const iri = Ontology.specBlockIri(context.path, block.type, count === 1 ? key : `${key}~${count}`).value;
    iris.set(block, iri);
    const parentIri = parent ? iris.get(parent) : undefined;
    return {
      '@id': iri,
      '@type': 'SpecBlock',
      'blockType': block.type,
      ...(named ? {} : block.id ? { blockId: block.id } : {}),
      ...(named ? (block.id ? { name: block.id } : {}) : block.title ? { name: block.title } : {}),
      'line': block.line,
      'body': block.body,
      ...(block.prose !== undefined ? { prose: block.prose } : {}),
      'mentions': [...block.mentions],
      'hasField': fieldNodes(block.fields, iri, undefined, dir, false),
      ...(parentIri ? { partOf: parentIri } : {}),
      ...(base.inPackage ? { inPackage: base.inPackage } : {}),
    };
  });
  const { frontmatter } = document;
  const id = frontmatter.id;
  const name = frontmatter.name;
  const version = frontmatter.version;
  const others = Object.entries(frontmatter)
    .filter(([key]) => !FRONTMATTER.has(key))
    .flatMap(([key, value]) => asList(value).map((entry) => `${key}=${entry}`));
  return {
    ...base,
    ...(typeof id === 'string' ? { specId: id } : {}),
    ...(typeof name === 'string' ? { specName: name } : {}),
    ...(typeof version === 'string' ? { specVersion: version } : {}),
    ...(frontmatter.extends !== undefined ? { specExtends: asList(frontmatter.extends) } : {}),
    ...(others.length > 0 ? { frontmatter: others } : {}),
    usesExtension: document.extensions.map((use) => ({
      '@id': Ontology.extensionUseIri(context.path, use.term).value,
      '@type': 'ExtensionUse',
      'term': use.term,
      'extension': {
        '@id': Ontology.extensionIri(use.uri).value,
        '@type': 'Extension',
        'extensionUri': use.uri,
      },
    })),
    declaresBlock: blocks,
  };
};
