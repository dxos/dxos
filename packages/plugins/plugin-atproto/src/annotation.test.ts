//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Type } from '@dxos/echo';
import { AtprotoVisibilityAnnotation } from '@dxos/schema';

import { getFieldPublishFlags } from './annotation';

// A partially-published struct (`meta`), a mirrored struct (`link`, whose unannotated fields are
// visible via an external record, with one field forced private), plus non-optional published,
// optional published (annotation applied before `Schema.optional`), and private fields — exercises the
// union/refinement unwrapping, the struct descent, and visibility inheritance/override.
const Meta = Schema.Struct({
  shown: Schema.String.pipe(AtprotoVisibilityAnnotation.set('publish')),
  hidden: Schema.optional(Schema.String),
});

const Link = Schema.Struct({
  pub: Schema.String.pipe(AtprotoVisibilityAnnotation.set('publish')),
  ext: Schema.optional(Schema.String),
  secret: Schema.String.pipe(AtprotoVisibilityAnnotation.set('private')),
}).pipe(AtprotoVisibilityAnnotation.set('mirror'));

class Sample extends Type.makeObject<Sample>(DXN.make('org.dxos.test.publishFlags', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.pipe(AtprotoVisibilityAnnotation.set('publish')),
    rating: Schema.Number.pipe(
      Schema.int(),
      Schema.between(1, 10),
      AtprotoVisibilityAnnotation.set('publish'),
      Schema.optional,
    ),
    secret: Schema.optional(Schema.String),
    meta: Meta,
    link: Link,
  }),
) {}

describe('getFieldPublishFlags', () => {
  test('descends nested structs and resolves visibility through wrappers and inheritance', ({ expect }) => {
    const flags = new Map(getFieldPublishFlags(Type.getSchema(Sample)).map((flag) => [flag.path, flag]));

    expect(flags.get('title')?.visibility).toBe('publish');
    // Regression: an optional field marked published must read as published (its annotation is on the
    // value type inside the optional `Union(X, undefined)`, not on `property.type`).
    expect(flags.get('rating')?.visibility).toBe('publish');
    // A genuinely private field (unannotated, at the root).
    expect(flags.get('secret')?.visibility).toBe('private');

    // The partially-published `meta` struct expands to its fields (a group header + nested leaves).
    expect(flags.get('meta')?.group).toBe(true);
    expect(flags.get('meta.shown')).toMatchObject({ visibility: 'publish', depth: 1 });
    // `meta` itself is unannotated (inherits private), so its unannotated field is private.
    expect(flags.get('meta.hidden')?.visibility).toBe('private');

    // The mirrored struct: its published field stays published (override wins over the mirrored
    // parent); its unannotated field inherits mirrored; a field forced private overrides the parent.
    expect(flags.get('link')?.visibility).toBe('mirror');
    expect(flags.get('link.pub')?.visibility).toBe('publish');
    expect(flags.get('link.ext')?.visibility).toBe('mirror');
    expect(flags.get('link.secret')?.visibility).toBe('private');
  });
});
