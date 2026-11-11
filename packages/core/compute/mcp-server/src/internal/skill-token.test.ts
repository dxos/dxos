//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as SkillToken from './skill-token.ts';

//
// A token is derived from the skill's key alone, which is what lets two processes serving one
// session (EDGE's MCP gateway and the worker running `runScript`) agree without sharing anything:
// they used to key the derivation off the host's own credential, and the one that had none refused
// every token the other issued.
//

const KEYS = ['org.dxos.skill.project', 'org.dxos.skill.github', 'org.dxos.skill.database'];

describe('skill token', () => {
  test('the same key always gives the same word, and it is one of the list', ({ expect }) => {
    for (const key of KEYS) {
      const word = SkillToken.derive(key);
      expect(SkillToken.derive(key)).to.equal(word);
      expect(SkillToken.WORDS).to.include(word);
    }
  });

  test('a token names one skill, so another skill does not get the same word', ({ expect }) => {
    const words = KEYS.map(SkillToken.derive);
    expect(new Set(words).size).to.equal(KEYS.length);
  });

  test('the words spread across the list rather than clustering', ({ expect }) => {
    const keys = Array.from({ length: 2000 }, (_, index) => `org.dxos.skill.generated${index}`);
    // A clustering hash would hand the same few words to every skill, making a token meaningless.
    expect(new Set(keys.map(SkillToken.derive)).size).to.be.greaterThan(SkillToken.WORDS.length * 0.9);
  });

  test('a capitalized or padded echo reads as the same token', ({ expect }) => {
    const word = SkillToken.derive(KEYS[0]);
    expect(SkillToken.normalize(`  ${word.toUpperCase()}\n`)).to.equal(word);
  });
});
