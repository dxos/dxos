//
// Copyright 2024 DXOS.org
//

// Parser for the human-authored conversation fixture (see `conversation.txt`).
// Captures both the seed entities (Persons, Organizations, …) and the speaker-tagged
// dialogue used by `stream-simulator.ts` to feed the pipeline in tests.

export type ConversationEntity = {
  /** Type name as written in the fixture, e.g. `Person`, `Organization`. */
  kind: string;
  /** Free-form field values; consumers map these to the relevant ECHO schema. */
  fields: Record<string, string>;
};

export type ConversationUtterance = {
  /** Speaker label as written in the fixture (e.g. `A`, `B`, `Rich`). */
  speaker: string;
  /** Raw utterance text. */
  text: string;
};

export type ParsedConversation = {
  entities: ConversationEntity[];
  utterances: ConversationUtterance[];
  /** Distinct speaker labels in first-seen order. */
  speakers: string[];
};

/**
 * Parse the on-disk conversation format into structured data.
 *
 * Tolerates leading whitespace inside blocks and ignores blank / `#` comment lines.
 * Throws if the input doesn't contain a `Conversation:` block — `Entities:` is optional.
 */
export const parseConversation = (input: string): ParsedConversation => {
  const lines = input.split('\n').map((line) => line.replace(/\s+$/, ''));

  const entities: ConversationEntity[] = [];
  const utterances: ConversationUtterance[] = [];
  const speakerOrder = new Set<string>();

  type Section = 'none' | 'entities' | 'conversation';
  let section: Section = 'none';
  let currentEntity: ConversationEntity | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    // Section headers (must be left-aligned to switch sections).
    if (raw.startsWith('Entities:') || raw.startsWith('Entitites:')) {
      // tolerate the typo present in earlier fixtures
      section = 'entities';
      currentEntity = undefined;
      continue;
    }
    if (raw.startsWith('Conversation:')) {
      section = 'conversation';
      currentEntity = undefined;
      continue;
    }

    if (section === 'entities') {
      // `<TypeName>:` starts a new entity; nested `<field>: <value>` lines fill it.
      const typeMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):$/);
      if (typeMatch) {
        currentEntity = { kind: typeMatch[1], fields: {} };
        entities.push(currentEntity);
        continue;
      }
      const fieldMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/);
      if (fieldMatch && currentEntity) {
        currentEntity.fields[fieldMatch[1]] = fieldMatch[2];
        continue;
      }
      // Silently skip unrecognised lines so authors can add free-form annotations.
      continue;
    }

    if (section === 'conversation') {
      const utteranceMatch = line.match(/^([^:]+):\s*(.+)$/);
      if (utteranceMatch) {
        const speaker = utteranceMatch[1].trim();
        const text = utteranceMatch[2].trim();
        if (text.length > 0) {
          utterances.push({ speaker, text });
          speakerOrder.add(speaker);
        }
      }
    }
  }

  if (utterances.length === 0) {
    throw new Error('parseConversation: no utterances found');
  }

  return { entities, utterances, speakers: Array.from(speakerOrder) };
};
