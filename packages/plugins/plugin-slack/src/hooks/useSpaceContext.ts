//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

/** Typenames for content objects worth including in context. */
const CONTENT_TYPENAMES = [
  'org.dxos.type.document',
  'org.dxos.type.task',
  'org.dxos.type.person',
  'org.dxos.type.organization',
  'org.dxos.type.subscription.post',
  'org.dxos.type.subscription.feed',
  'org.dxos.type.event',
  'org.dxos.type.meeting',
  'dxos.org/type/Memory',
];

/** Fields to extract text from for matching and context. */
const TEXT_FIELDS = [
  'title', 'name', 'fullName', 'content', 'text', 'description',
  'subject', 'link', 'author', 'published', 'url', 'notes',
];

/**
 * Searches ECHO space objects for relevant context to include in AI prompts.
 */
export const useSpaceContext = (db: Database.Database | undefined) => {
  const searchContext = useCallback(
    async (query: string, maxResults = 15): Promise<string> => {
      if (!db) {
        return '';
      }

      try {
        // Query content objects specifically by typename.
        const contentObjects: any[] = [];
        for (const typename of CONTENT_TYPENAMES) {
          try {
            const results = await db.query(Filter.typename(typename)).run();
            contentObjects.push(...results);
          } catch {
            // Skip typenames that don't exist in this space.
          }
        }

        // Also get all objects for keyword matching.
        const allObjects = await db.query(Filter.everything()).run();

        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 2);

        const scored: { id: string; score: number; summary: string }[] = [];
        const seenIds = new Set<string>();

        const scoreObject = (object: any, bonus = 0) => {
          const objectId = (object as any).id;
          if (!objectId || seenIds.has(objectId)) {
            return;
          }
          seenIds.add(objectId);

          let score = bonus;
          const parts: string[] = [];

          for (const field of TEXT_FIELDS) {
            const value = (object as any)[field];
            if (typeof value === 'string' && value.length > 0) {
              const valueLower = value.toLowerCase();
              for (const word of queryWords) {
                if (valueLower.includes(word)) {
                  score += 2;
                }
              }
              if (value.length > 3) {
                parts.push(`${field}: ${value.slice(0, 300)}`);
              }
            }
          }

          // Check ECHO text content (referenced documents).
          const content = (object as any).content;
          if (content && typeof content === 'object' && typeof content.text === 'string') {
            const textContent = content.text;
            const textLower = textContent.toLowerCase();
            for (const word of queryWords) {
              if (textLower.includes(word)) {
                score += 3;
              }
            }
            parts.push(`content: ${textContent.slice(0, 500)}`);
          }

          // Check message blocks.
          const blocks = (object as any).blocks;
          if (Array.isArray(blocks)) {
            for (const block of blocks.slice(0, 5)) {
              if (block?.text && typeof block.text === 'string') {
                const blockLower = block.text.toLowerCase();
                for (const word of queryWords) {
                  if (blockLower.includes(word)) {
                    score += 1;
                  }
                }
                parts.push(`message: ${block.text.slice(0, 200)}`);
              }
            }
          }

          if (parts.length > 0 && score > 0) {
            const typename = Obj.getSchema(object)?.typename ?? 'Object';
            scored.push({
              id: objectId,
              score,
              summary: `[${typename}] ${parts.join(' | ')}`,
            });
          }
        };

        // Score content objects with a bonus (they're inherently more relevant).
        for (const object of contentObjects) {
          scoreObject(object, 1);
        }

        // Score all objects for keyword matches.
        for (const object of allObjects) {
          scoreObject(object);
        }

        // Sort by score, take top results.
        scored.sort((first, second) => second.score - first.score);
        const topResults = scored.slice(0, maxResults);

        if (topResults.length === 0) {
          return '';
        }

        log.info('slack: found ECHO context', { query, results: topResults.length, total: contentObjects.length + allObjects.length });

        const contextLines = topResults.map((result, index) => `${index + 1}. ${result.summary}`);
        return `\n\n--- Relevant data from the user's workspace ---\n${contextLines.join('\n')}\n--- End workspace data ---`;
      } catch (err) {
        log.warn('slack: failed to search ECHO', { error: String(err) });
        return '';
      }
    },
    [db],
  );

  return { searchContext };
};
