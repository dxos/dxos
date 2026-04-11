//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

/**
 * Searches ECHO space objects for relevant context to include in AI prompts.
 * Returns a formatted string with relevant documents, notes, tasks, and recent activity.
 */
export const useSpaceContext = (db: Database.Database | undefined) => {
  const searchContext = useCallback(
    async (query: string, maxResults = 10): Promise<string> => {
      if (!db) {
        return '';
      }

      try {
        // Query all objects and do client-side text matching.
        // This is simple but effective for demo purposes.
        const allObjects = db.query(Filter.everything()).results;

        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 2);

        const scored: { object: any; score: number; summary: string }[] = [];

        for (const object of allObjects) {
          let score = 0;
          const parts: string[] = [];

          // Check common fields for text matches.
          const fields = ['title', 'name', 'fullName', 'content', 'text', 'description', 'subject'];
          for (const field of fields) {
            const value = (object as any)[field];
            if (typeof value === 'string' && value.length > 0) {
              const valueLower = value.toLowerCase();
              for (const word of queryWords) {
                if (valueLower.includes(word)) {
                  score += 2;
                }
              }
              parts.push(`${field}: ${value.slice(0, 200)}`);
            }
          }

          // Check for ECHO text content (documents/notes).
          const content = (object as any).content;
          if (content && typeof content === 'object' && content.text) {
            const textContent = String(content.text);
            const textLower = textContent.toLowerCase();
            for (const word of queryWords) {
              if (textLower.includes(word)) {
                score += 3;
              }
            }
            parts.push(`content: ${textContent.slice(0, 300)}`);
          }

          // Check message blocks.
          const blocks = (object as any).blocks;
          if (Array.isArray(blocks)) {
            for (const block of blocks) {
              if (block?.text) {
                const blockText = String(block.text);
                const blockLower = blockText.toLowerCase();
                for (const word of queryWords) {
                  if (blockLower.includes(word)) {
                    score += 1;
                  }
                }
                parts.push(`message: ${blockText.slice(0, 200)}`);
              }
            }
          }

          if (score > 0 && parts.length > 0) {
            const typename = Obj.getSchema(object)?.typename ?? 'Object';
            scored.push({
              object,
              score,
              summary: `[${typename}] ${parts.join(' | ')}`,
            });
          }
        }

        // Sort by score, take top results.
        scored.sort((first, second) => second.score - first.score);
        const topResults = scored.slice(0, maxResults);

        if (topResults.length === 0) {
          return '';
        }

        log.info('slack: found ECHO context', { query, results: topResults.length });

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
