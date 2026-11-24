//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { describe, test } from 'vitest';

import { Type } from '@dxos/echo';

import * as Color from './color.ts';
import * as Element from './element.ts';
import { TASK, outputs } from './ontology-files.ts';
import * as Ontology from './ontology.ts';
import * as Scene from './Scene.ts';
import * as Shape from './shape.ts';
import * as Style from './style.ts';
import * as Theme from './theme.ts';

const MODULES: Readonly<Record<Ontology.Module, Readonly<Record<string, unknown>>>> = {
  Scene,
  element: Element,
  style: Style,
  shape: Shape,
  color: Color,
  theme: Theme,
};

/** Exported schemas that are not part of a stored drawing, by `module.name`, each with the reason. */
const EXCLUDED: Readonly<Record<string, string>> = {};

describe('Ontology', () => {
  test('registers every exported schema', ({ expect }) => {
    const schemas = new Set(Ontology.ENTRIES.map(({ schema }) => schema));
    const types = new Set(Ontology.ENTRIES.flatMap(({ echo }) => (echo ? [echo.uri] : [])));
    const missing = Object.entries(MODULES).flatMap(([module, exports]) =>
      Object.entries(exports)
        .filter(([, value]) =>
          Type.isType(value) ? !types.has(Type.getURI(value)) : Schema.isSchema(value) && !schemas.has(value),
        )
        .map(([name]) => `${module}.${name}`)
        .filter((name) => !(name in EXCLUDED)),
    );
    expect(missing, 'Register each in ENTRIES (ontology.ts), or exclude it here with a reason.').toEqual([]);
  });

  test('names are unique, and so are their anchors', ({ expect }) => {
    const names = Ontology.ENTRIES.map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(names.map(Ontology.slugOf)).size).toBe(names.length);
  });

  test('every base is a struct its entry differs from by fields', ({ expect }) => {
    const all = Ontology.describe();
    const unresolved = all
      .filter((described) => described.entry.base !== undefined && Ontology.diffBase(described, all) === undefined)
      .map(({ entry }) => entry.name);
    expect(unresolved).toEqual([]);
  });

  test('every kind a layout may hold is described or listed as external', ({ expect }) => {
    const described = Ontology.describe().flatMap(({ type }) =>
      type.kind === 'object'
        ? type.fields.flatMap((field) =>
            field.name === 'kind' && field.type.kind === 'literals' ? field.type.values : [],
          )
        : [],
    );
    const known = new Set([...described, ...Ontology.EXTERNAL_KINDS.map(({ kind }) => kind)]);
    const kinds = [...Scene.kindsOf('2d'), ...Scene.kindsOf('3d')];
    expect(kinds.filter((kind) => !known.has(kind))).toEqual([]);
  });

  test('every reference in the JSON Schema resolves', ({ expect }) => {
    const document = Ontology.toJsonSchema();
    const defs = document.$defs;
    const references = JSON.stringify(document).match(/"\$ref":"[^"]+"/g) ?? [];
    const names = references.map((reference) => reference.slice('"$ref":"#/$defs/'.length, -1));
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !(typeof defs === 'object' && defs !== null && name in defs))).toEqual([]);
  });

  test('the document root mirrors SceneDocument', ({ expect }) => {
    const toDocument = (document: Schema.Schema.Type<typeof Ontology.Document>): Scene.SceneDocument => document;
    const fromDocument = (document: Scene.SceneDocument): Schema.Schema.Type<typeof Ontology.Document> => document;
    const document: Scene.SceneDocument = { scenes: [], layouts: [], models: [] };
    expect(toDocument(fromDocument(document))).toBe(document);
  });

  test('generated files are current', ({ expect }) => {
    for (const { path, content } of outputs()) {
      expect(readFileSync(path, 'utf8'), `${path} is stale: run \`${TASK}\`.`).toBe(content);
    }
  });
});
