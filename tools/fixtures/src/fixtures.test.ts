//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { FIXTURES_DIR, fixtureExists, fixturePath, fixtureVersions, readFixture } from './index';

/**
 * Sanity check for a pulled fixture: proves the archive is present, parses, and carries the fields
 * every downstream pipeline reads, then prints a summary of what is in it.
 *
 * This is the first thing to run after `moon run fixtures:pull` — it separates "the transfer worked"
 * from "my pipeline is wrong", which are otherwise easy to confuse when a test over a real corpus
 * misbehaves.
 *
 * Skipped wherever the fixture is absent, which includes all of CI: a suite depending on a private
 * corpus must never be able to fail the build.
 */
const FIXTURE = process.env.DX_FIXTURE_NAME ?? 'inbox';

/** The subset of a serialized message this check reads. */
type ArchivedMessage = {
  created?: string;
  sender?: { email?: string; name?: string };
  blocks?: { _tag?: string; text?: string }[];
};

describe.skipIf(!fixtureExists(FIXTURE))(`fixture "${FIXTURE}"`, () => {
  test('parses and reports its contents', () => {
    const messages = readFixture<ArchivedMessage>(FIXTURE);
    expect(messages.length).toBeGreaterThan(0);

    const senders = new Set(messages.map((message) => message.sender?.email?.toLowerCase()).filter(Boolean));
    const dated = messages.map((message) => message.created).filter((created): created is string => Boolean(created));
    const sorted = [...dated].sort();

    // eslint-disable-next-line no-console
    console.log(
      [
        `fixture:  ${fixturePath(FIXTURE)}`,
        `versions: ${fixtureVersions(FIXTURE).join(', ') || '(none)'}`,
        `messages: ${messages.length}`,
        `senders:  ${senders.size}`,
        `range:    ${sorted.at(0) ?? '?'} … ${sorted.at(-1) ?? '?'}`,
      ].join('\n'),
    );

    // The fields every mail pipeline reads. A capture that silently lost one of these would
    // otherwise surface much later as an empty extraction rather than a broken fixture.
    expect(senders.size).toBeGreaterThan(0);
    expect(dated.length).toBe(messages.length);
    expect(messages.some((message) => (message.blocks ?? []).some((block) => block._tag === 'text'))).toBe(true);
  });

  test('every version is readable', () => {
    for (const version of fixtureVersions(FIXTURE)) {
      expect(readFixture<ArchivedMessage>(FIXTURE, { version }).length).toBeGreaterThan(0);
    }
  });
});

describe.skipIf(fixtureExists(FIXTURE))(`fixture "${FIXTURE}" (absent)`, () => {
  test('reports how to obtain it', () => {
    // Not a failure: the absent case is the normal one (CI, and any machine that has not pulled).
    // Asserting the resolver's absent-behaviour here keeps that contract covered when nobody has a
    // corpus, which is exactly when it is easiest to break unnoticed.
    expect(fixturePath(FIXTURE)).toBeUndefined();
    expect(fixtureVersions(FIXTURE)).toEqual([]);
    expect(() => readFixture(FIXTURE)).toThrow(/moon run fixtures:pull -- /);

    // eslint-disable-next-line no-console
    console.log(`No "${FIXTURE}" fixture in ${FIXTURES_DIR}. Pull one: moon run fixtures:pull -- ${FIXTURE}`);
  });
});
