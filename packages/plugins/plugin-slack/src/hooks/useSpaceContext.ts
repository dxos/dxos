//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';

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
  const searchContext = useCallback(
    async (query: string, maxResults = 20): Promise<string> => {
      if (!db) {
        return '';
      }

      try {
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

          // Check message blocks (for emails and chat messages).
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
              const subjectLower = propSubject.toLowerCase();
              for (const word of queryWords) {
                if (subjectLower.includes(word)) {
                  score += 3;
                }
              }
              parts.push(`subject: ${propSubject}`);
            }
          }

          if (parts.length > 0) {
            // Give a minimum score of 1 to all objects with text content.
            // This ensures recent feed items show up even without keyword matches.
            score = Math.max(score, parts.length > 0 ? 1 : 0);
            const typename = Obj.getSchema(object)?.typename ?? 'Object';
            scored.push({
              id: objectId,
              score: score + bonus,
              summary: `[${typename}] ${parts.join(' | ')}`,
            });
          }
        };

        // 1. Query top-level space objects.
        const allObjects = await db.query(Filter.everything()).run();
        for (const object of allObjects) {
          scoreObject(object);
        }

        // 2. Find all Feed objects and query their contents.
        // Only query data/content feeds, skip trace and system feeds.
        const feedObjects = allObjects.filter((obj) => {
          const typename = Obj.getSchema(obj)?.typename;
          if (typename !== 'org.dxos.type.feed') {
            return false;
          }
          // Skip trace feeds and system feeds — they can be very large.
          const namespace = (obj as any).namespace;
          const kind = (obj as any).kind;
          const name = (obj as any).name;
          if (namespace === 'trace' || kind === 'trace' || name === 'Execution Trace') {
            return false;
          }
          return true;
        });

        let feedItemCount = 0;
        for (const feedObj of feedObjects) {
          try {
            // Query items from this feed with a timeout to avoid hanging on large feeds.
            const feedQueryPromise = db.query(Query.select(Filter.everything()).from(feedObj as Feed.Feed)).run();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Feed query timeout')), 5000),
            );
            const feedItems = await Promise.race([feedQueryPromise, timeoutPromise]);
            feedItemCount += feedItems.length;
            // Only include the most recent 50 items per feed to avoid overwhelming the context.
            const recentItems = feedItems.slice(-50);
            for (const item of recentItems) {
              scoreObject(item, 2);
            }
          } catch {
            // Some feeds may not be queryable or may timeout. Skip silently.
          }
        }

        log.info('slack: ECHO context search', {
          query: queryLower.slice(0, 50),
          topLevelObjects: allObjects.length,
          feeds: feedObjects.length,
          feedItems: feedItemCount,
          scored: scored.length,
        });

        // Sort by score, take top results.
        scored.sort((first, second) => second.score - first.score);
        const topResults = scored.slice(0, maxResults);

        if (topResults.length === 0) {
          return '';
        }

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
