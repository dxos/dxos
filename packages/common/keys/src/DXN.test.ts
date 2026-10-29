//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expectTypeOf, test } from 'vitest';

import * as DXN from './DXN.ts';

describe('DXN.isDXN', () => {
  test('accepts new-format DXNs', ({ expect }) => {
    expect(DXN.isDXN('dxn:org.dxos.type.calendar')).toBe(true);
    expect(DXN.isDXN('dxn:org.dxos.type.calendar:1.0.0')).toBe(true);
    expect(DXN.isDXN('dxn:com.alice.type.contact:2.1.0')).toBe(true);
    expect(DXN.isDXN('dxn:org.dxos.plugin.markdown')).toBe(true);
    expect(DXN.isDXN('dxn:org.dxos.type.calendarEvent')).toBe(true);
  });

  test('rejects non-DXN strings', ({ expect }) => {
    expect(DXN.isDXN('echo://space/object')).toBe(false);
    expect(DXN.isDXN('https://example.com')).toBe(false);
    expect(DXN.isDXN('')).toBe(false);
    expect(DXN.isDXN(42)).toBe(false);
  });
});

describe('DXN.Name', () => {
  test('accepts valid NSIDs - no type errors', () => {
    // Three-segment minimum (first + middle + final), all camelCase.
    DXN.make('a.b.c');
    // Multi-segment, all camelCase.
    DXN.make('org.dxos.type.calendar');
    // Hyphen is allowed in a MIDDLE segment.
    DXN.make('org.dxos.app-framework.event.startup');
    // Versioned form.
    DXN.make('org.dxos.type.calendar', '1.0.0');
  });

  test('rejects invalid NSIDs - compile-time type errors', () => {
    // Wrapped in a never-called arrow so the invalid calls are type-checked but
    // never executed at runtime. If Name unexpectedly starts accepting any
    // of these, the @ts-expect-error directive itself becomes a build error
    // ("Unused '@ts-expect-error' directive"), causing the CI check to fail.
    void (() => {
      // No dots - single segment.
      // @ts-expect-error
      DXN.make('unknown');
      // One dot - two segments, below the three-segment minimum.
      // @ts-expect-error
      DXN.make('a.b');
      // Hyphen in the FINAL segment.
      // @ts-expect-error
      DXN.make('com.example.type.registry-entry');
      // Hyphen in the final segment, versioned.
      // @ts-expect-error
      DXN.make('com.example.type.registry-entry', '0.1.0');
      // Common mistake: kebab-case activation event name.
      // @ts-expect-error
      DXN.make('org.dxos.app-framework.event.setup-react-surface');
    });
  });
});

describe('DXN.Path', () => {
  test('accepts a camelCase final segment, with or without a dotted prefix', ({ expect }) => {
    expectTypeOf<DXN.Path<'about'>>().toEqualTypeOf<'about'>();
    expectTypeOf<DXN.Path<'integrationArticle'>>().toEqualTypeOf<'integrationArticle'>();
    expectTypeOf<DXN.Path<'article.taskSet'>>().toEqualTypeOf<'article.taskSet'>();
    // Only the final segment is constrained; a prefix may carry a hyphenated typename.
    expectTypeOf<DXN.Path<'org.dxos.type.task-set.article'>>().toEqualTypeOf<'org.dxos.type.task-set.article'>();

    expect(
      ['about', 'integrationArticle', 'article.taskSet', 'org.dxos.type.task-set.article'].every(DXN.isValidPath),
    ).toBe(true);
  });

  test('rejects a final segment the surface manager would drop', ({ expect }) => {
    expectTypeOf<DXN.Path<'article.task-set'>>().toEqualTypeOf<never>();
    expectTypeOf<DXN.Path<'plugin-settings'>>().toEqualTypeOf<never>();
    expectTypeOf<DXN.Path<'plugin_settings'>>().toEqualTypeOf<never>();
    // Must start with a letter - the id becomes a DXN path segment.
    expectTypeOf<DXN.Path<'1article'>>().toEqualTypeOf<never>();
    expectTypeOf<DXN.Path<''>>().toEqualTypeOf<never>();
    // Any character the runtime regex excludes, not just the separators.
    expectTypeOf<DXN.Path<'article/task'>>().toEqualTypeOf<never>();
    expectTypeOf<DXN.Path<'article task'>>().toEqualTypeOf<never>();
    expectTypeOf<DXN.Path<'article.task/set'>>().toEqualTypeOf<never>();

    expect(
      [
        'article.task-set',
        'plugin-settings',
        'plugin_settings',
        '1article',
        '',
        'article/task',
        'article task',
        'article.task/set',
      ].some(DXN.isValidPath),
    ).toBe(false);
  });

  test('passes a widened string through for the runtime to check', () => {
    // A computed id (`${typename}.sectionObjects`) has no literal type to inspect.
    expectTypeOf<DXN.Path<string>>().toEqualTypeOf<string>();
  });

  test('accepts an interpolated segment, whose placeholder cannot be inspected', () => {
    expectTypeOf<DXN.Path<`beta${number}`>>().toEqualTypeOf<`beta${number}`>();
    expectTypeOf<DXN.Path<`r${number}s${number}`>>().toEqualTypeOf<`r${number}s${number}`>();
    expectTypeOf<DXN.Path<`prefix.item${number}`>>().toEqualTypeOf<`prefix.item${number}`>();
    // A separator around the placeholder is still caught.
    expectTypeOf<DXN.Path<`beta-${number}`>>().toEqualTypeOf<never>();
  });
});

describe('DXN.make', () => {
  test('produces unversioned DXN', ({ expect }) => {
    expect(DXN.make('org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
  });

  test('produces versioned DXN', ({ expect }) => {
    expect(DXN.make('org.dxos.type.calendar', '1.0.0')).toBe('dxn:org.dxos.type.calendar:1.0.0');
  });

  test('throws on invalid NSID at runtime', ({ expect }) => {
    // @ts-expect-error intentionally invalid NSIDs - verifying runtime throws
    expect(() => DXN.make('not-a-valid-nsid')).toThrow();
    // @ts-expect-error
    expect(() => DXN.make('com.example.type.registry-entry')).toThrow();
    // @ts-expect-error
    expect(() => DXN.make('com.example.type.registry-entry', '0.1.0')).toThrow();
  });
});

describe('DXN.tryMake', () => {
  test('parses new-format DXN strings', ({ expect }) => {
    expect(DXN.tryMake('dxn:org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
    expect(DXN.tryMake('dxn:org.dxos.type.calendar:1.0.0')).toBe('dxn:org.dxos.type.calendar:1.0.0');
  });

  test('returns undefined on invalid input', ({ expect }) => {
    expect(DXN.tryMake('not-a-dxn')).toBeUndefined();
    expect(DXN.tryMake('dxn:invalid')).toBeUndefined();
  });

  test('rejects hyphens in the last NSID segment (must be camelCase)', ({ expect }) => {
    expect(DXN.tryMake('dxn:com.example.type.registry-entry')).toBeUndefined();
    expect(DXN.tryMake('dxn:com.example.type.registry-entry:0.1.0')).toBeUndefined();
  });

  test('accepts hyphens in middle segments but not the last', ({ expect }) => {
    expect(DXN.tryMake('dxn:org.dxos.relation.plugin-crm.profileOf')).toBe(
      'dxn:org.dxos.relation.plugin-crm.profileOf',
    );
  });
});

describe('DXN.getName', () => {
  test('extracts NSID from new-format DXN', ({ expect }) => {
    expect(DXN.getName(DXN.make('org.dxos.type.calendar'))).toBe('org.dxos.type.calendar');
    expect(DXN.getName(DXN.make('org.dxos.plugin.markdown'))).toBe('org.dxos.plugin.markdown');
  });

  test('extracts NSID from versioned DXN (without version)', ({ expect }) => {
    expect(DXN.getName(DXN.make('org.dxos.type.calendar', '1.0.0'))).toBe('org.dxos.type.calendar');
  });
});

describe('DXN.getVersion', () => {
  test('returns version from versioned DXN', ({ expect }) => {
    expect(DXN.getVersion(DXN.make('org.dxos.type.calendar', '1.0.0'))).toBe('1.0.0');
    expect(DXN.getVersion(DXN.make('com.alice.type.contact', '2.1.0'))).toBe('2.1.0');
  });

  test('returns undefined for unversioned DXN', ({ expect }) => {
    expect(DXN.getVersion(DXN.make('org.dxos.type.calendar'))).toBeUndefined();
  });
});

describe('DXN.NameSchema', () => {
  const isName = Schema.is(DXN.NameSchema);

  test('accepts a well-formed NSID name (no dxn: prefix)', ({ expect }) => {
    expect(isName('com.anthropic.model.claude-sonnet-4-6.default')).toBe(true);
    expect(isName('org.dxos.provider.edge')).toBe(true);
    expect(isName('com.meta.model.llama-3-2-1b.instruct')).toBe(true);
  });

  test('rejects malformed names', ({ expect }) => {
    expect(isName('single')).toBe(false); // not multi-segment
    expect(isName('com.example.model.has-hyphen')).toBe(false); // final segment has a hyphen
    expect(isName('dxn:com.example.type.thing')).toBe(false); // already a full DXN, not a bare name
  });
});

describe('DXN mnemonic suffix', () => {
  const name = 'dxn:network.dxos.team.features.mcp.codeMode';
  const parse = (value: string): DXN.DXN => {
    const dxn = DXN.tryMake(value);
    if (dxn === undefined) {
      throw new Error(`Invalid DXN: ${value}`);
    }
    return dxn;
  };

  test('tryMake accepts a mnemonic after the name or the version', ({ expect }) => {
    expect(DXN.tryMake(`${name}#ABC123`)).toBe(`${name}#ABC123`);
    expect(DXN.tryMake(`${name}#abc123`)).toBe(`${name}#abc123`);
    expect(DXN.tryMake(`${name}:1.0.0#ABC123`)).toBe(`${name}:1.0.0#ABC123`);
  });

  test('tryMake rejects a malformed mnemonic', ({ expect }) => {
    expect(DXN.tryMake(`${name}#`)).toBeUndefined();
    expect(DXN.tryMake(`${name}#ABC12`)).toBeUndefined();
    expect(DXN.tryMake(`${name}#ABC1234`)).toBeUndefined();
    // Crockford base32 excludes I, L, O and U.
    expect(DXN.tryMake(`${name}#ABCIL0`)).toBeUndefined();
    expect(DXN.tryMake(`${name}#ABC123:1.0.0`)).toBeUndefined();
  });

  test('getName and getVersion ignore the mnemonic', ({ expect }) => {
    const dxn = parse(`${name}:1.2.3#ABC123`);
    expect(DXN.getName(dxn)).toBe('network.dxos.team.features.mcp.codeMode');
    expect(DXN.getVersion(dxn)).toBe('1.2.3');
    expect(DXN.getVersion(parse(`${name}#ABC123`))).toBeUndefined();
  });

  test('getMnemonic returns the suffix uppercased', ({ expect }) => {
    expect(DXN.getMnemonic(parse(`${name}#abc123`))).toBe('ABC123');
    expect(DXN.getMnemonic(parse(name))).toBeUndefined();
  });

  test('withMnemonic sets and replaces the suffix; withoutMnemonic removes it', ({ expect }) => {
    const plain = parse(name);
    const linked = DXN.withMnemonic(plain, 'abc123');
    expect(linked).toBe(`${name}#ABC123`);
    expect(DXN.withMnemonic(linked, 'ZZZ999')).toBe(`${name}#ZZZ999`);
    expect(DXN.withoutMnemonic(linked)).toBe(name);
    expect(DXN.withoutMnemonic(plain)).toBe(name);
    expect(() => DXN.withMnemonic(plain, 'bad')).toThrow();
  });

  test('NameSchema rejects a name with a mnemonic', ({ expect }) => {
    expect(Schema.is(DXN.NameSchema)('network.dxos.team.features.mcp.codeMode')).toBe(true);
    expect(Schema.is(DXN.NameSchema)('network.dxos.team.features.mcp.codeMode#ABC123')).toBe(false);
  });

  test('make never builds a DXN with a mnemonic', ({ expect }) => {
    const nsid: string = 'network.dxos.team.features.mcp.codeMode#ABC123';
    expect(() => DXN.make(nsid)).toThrow();
  });
});
