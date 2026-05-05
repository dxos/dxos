//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { extractUrls, useUrlEnricher } from './useUrlEnricher';

/** Fields to extract text from for matching and context. */
const TEXT_FIELDS = [
  'title', 'name', 'fullName', 'content', 'text', 'description',
  'subject', 'link', 'author', 'published', 'url', 'notes',
];

/**
 * Searches ECHO space objects AND feed items for relevant context.
 * Properly queries inside Feed objects (mailbox messages, calendar events, RSS posts).
 */
export const useSpaceContext = (db: Database.Database | undefined) => {
  const { fetchMany } = useUrlEnricher();

  const searchContext = useCallback(
    async (query: string, maxResults = 20): Promise<string> => {
      if (!db) {
        return '';
      }

      try {
        const queryLower = query.toLowerCase();
        // Strip <@U123> mentions before splitting.
        const cleanQuery = query.replace(/<@[A-Z0-9]+>/g, ' ');
        const allWords = cleanQuery.split(/\s+/).filter((word) => word.length > 2);
        const queryWords = allWords.map((word) => word.toLowerCase());

        // Identify "entity tokens" — capitalized words (proper nouns like company or
        // person names) in the original query. These are the words a user almost
        // always cares about. Rare-but-critical terms like "Hilbert" get drowned out
        // if we weight them the same as common words like "tell" or "about".
        // If any entity tokens are present, results MUST contain at least one of them,
        // otherwise we fall back to the old behavior.
        const entityTokens = allWords
          .filter((word) => /^[A-Z]/.test(word) || /\d/.test(word))
          .map((word) => word.toLowerCase())
          // Drop the leading-caps-by-sentence-start artifacts for very common words.
          .filter((word) => !['tell', 'what', 'which', 'why', 'how', 'who', 'when', 'where', 'the', 'and', 'but'].includes(word));
        const stopwords = new Set(['tell', 'about', 'what', 'which', 'why', 'how', 'who', 'when', 'where', 'the', 'and', 'but', 'for', 'did', 'was', 'are', 'have', 'has', 'our', 'your', 'this', 'that', 'with', 'from', 'you', 'can']);
        const rareTokens = queryWords.filter((word) => !stopwords.has(word));

        const scored: { id: string; score: number; summary: string; hasEntityMatch: boolean }[] = [];
        const seenIds = new Set<string>();

        // Score a word match. Entity tokens (proper nouns) are weighted very highly
        // because they're almost always what the user is actually asking about.
        // Stopwords get zero weight. Remaining "rare" tokens get a small weight.
        const wordWeight = (word: string, baseWeight: number): number => {
          if (entityTokens.includes(word)) {
            return baseWeight * 50;
          }
          if (stopwords.has(word)) {
            return 0;
          }
          return baseWeight;
        };

        const scoreObject = (object: any, bonus = 0) => {
          const objectId = (object as any).id;
          if (!objectId || seenIds.has(objectId)) {
            return;
          }
          seenIds.add(objectId);

          let score = bonus;
          let hasEntityMatch = false;
          const parts: string[] = [];

          const recordMatch = (haystackLower: string, baseWeight: number) => {
            for (const word of queryWords) {
              if (haystackLower.includes(word)) {
                score += wordWeight(word, baseWeight);
                if (entityTokens.includes(word)) {
                  hasEntityMatch = true;
                }
              }
            }
          };

          // Truncation limits per field. Short ID-like fields (name, title, subject)
          // stay small; narrative fields (description, content, notes) get far more
          // room since the entity filter already keeps result counts low.
          const LONG_FIELDS = new Set(['description', 'content', 'notes', 'text']);
          const fieldLimit = (field: string) => (LONG_FIELDS.has(field) ? 3000 : 300);

          for (const field of TEXT_FIELDS) {
            const value = (object as any)[field];
            if (typeof value === 'string' && value.length > 0) {
              recordMatch(value.toLowerCase(), 2);
              if (value.length > 3) {
                parts.push(`${field}: ${value.slice(0, fieldLimit(field))}`);
              }
            }
          }

          // Check ECHO text content (referenced documents).
          const content = (object as any).content;
          if (content && typeof content === 'object' && typeof content.text === 'string') {
            const textContent = content.text;
            recordMatch(textContent.toLowerCase(), 3);
            parts.push(`content: ${textContent.slice(0, 3000)}`);
          }

          // Check message blocks (for emails and chat messages).
          const blocks = (object as any).blocks;
          if (Array.isArray(blocks)) {
            for (const block of blocks.slice(0, 5)) {
              if (block?.text && typeof block.text === 'string') {
                recordMatch(block.text.toLowerCase(), 1);
                parts.push(`message: ${block.text.slice(0, 800)}`);
              }
            }
          }

          // Check sender info (for emails).
          const sender = (object as any).sender;
          if (sender) {
            const senderName = sender.name ?? sender.email ?? '';
            if (senderName) {
              parts.push(`from: ${senderName}`);
            }
          }

          // Check properties (email subject, etc.).
          const properties = (object as any).properties;
          if (properties && typeof properties === 'object') {
            const propSubject = properties.subject;
            if (typeof propSubject === 'string' && propSubject.length > 0) {
              recordMatch(propSubject.toLowerCase(), 3);
              parts.push(`subject: ${propSubject}`);
            }
          }

          if (parts.length > 0) {
            const typename = Obj.getSchema(object)?.typename ?? 'Object';
            scored.push({
              id: objectId,
              score: score + bonus,
              hasEntityMatch,
              summary: `[${typename}] ${parts.join(' | ')}`,
            });
          }
        };

        // 1. Query top-level space objects.
        const allObjects = await db.query(Filter.everything()).run();

        // Log typenames found for debugging.
        const typenameCounts: Record<string, number> = {};
        for (const object of allObjects) {
          const typename = Obj.getSchema(object)?.typename ?? 'unknown';
          typenameCounts[typename] = (typenameCounts[typename] ?? 0) + 1;
          scoreObject(object);
        }

        // If the user mentioned specific entities (proper nouns, IDs), results must
        // contain at least one of those entity tokens. Otherwise rare-but-critical
        // terms like "Hilbert" get drowned out by objects matching common words.
        const candidateSet = entityTokens.length > 0
          ? scored.filter((result) => result.hasEntityMatch)
          : scored;

        log.info('slack: ECHO context search', {
          query: queryLower.slice(0, 50),
          entityTokens,
          rareTokens,
          topLevelObjects: allObjects.length,
          scored: scored.length,
          candidates: candidateSet.length,
          types: typenameCounts,
        });

        // Sort by score, take top results.
        candidateSet.sort((first, second) => second.score - first.score);
        const topResults = candidateSet.slice(0, maxResults);

        if (topResults.length === 0) {
          return '';
        }

        const contextLines = topResults.map((result, index) => `${index + 1}. ${result.summary}`);
        const baseContext = contextLines.join('\n');

        // Generic URL enrichment: pull URLs out of the top snippets and fetch
        // their public content via the dev proxy. Content-agnostic — doesn't
        // know or care what any specific site is.
        const urlsInContext = extractUrls(baseContext, 3);
        let fetchedSection = '';
        if (urlsInContext.length > 0) {
          const fetched = await fetchMany(urlsInContext);
          if (fetched.size > 0) {
            const lines: string[] = [];
            for (const [url, text] of fetched) {
              lines.push(`[${url}]\n${text}`);
            }
            fetchedSection = `\n\n--- Fetched content from referenced URLs ---\n${lines.join('\n\n')}\n--- End fetched content ---`;
          }
        }

        return `\n\n--- Relevant data from the user's workspace ---\n${baseContext}\n--- End workspace data ---${fetchedSection}`;
      } catch (err) {
        log.warn('slack: failed to search ECHO', { error: String(err) });
        return '';
      }
    },
    [db, fetchMany],
  );

  return { searchContext };
};
