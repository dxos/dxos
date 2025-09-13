//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useEffect, useState } from 'react';

import { sleep } from '@dxos/async';
import { useDynamicRef } from '@dxos/react-ui';

/**
 * Streams text character by character with a delay. If the delay is zero, does nothing.
 */
export const useStreamingText = (text = '', view?: EditorView, perCharacterDelay = 10): [string, boolean] => {
  const [current, setCurrent] = useState(perCharacterDelay > 0 ? '' : text);
  const currentRef = useDynamicRef(current);

  useEffect(() => {
    if (!view) {
      return;
    }

    // Check if content has changed.
    const append = text.startsWith(view.state.doc.sliceString(0, view.state.doc.length));

    // Append or replace document.
    if (!perCharacterDelay) {
      if (append) {
        const append = text.slice(view.state.doc.length);
        view.dispatch({
          changes: [{ from: view.state.doc.length, insert: append }],
        });
        setCurrent(text);
      } else {
        view.dispatch({
          changes: [{ from: 0, to: view.state.doc.length, insert: text }],
        });
        setCurrent(text);
      }

      return;
    }

    let cancelled = false;
    const idx = text.indexOf(currentRef.current);
    let next = text;
    if (idx === 0) {
      next = text.slice(currentRef.current.length);
    } else {
      setCurrent('');
      view.dispatch({
        changes: [{ from: 0, to: view.state.doc.length, insert: '' }],
      });
    }

    void (async () => {
      for await (const chunk of streamText(next, perCharacterDelay)) {
        if (cancelled) {
          break;
        }

        setCurrent((prev) => {
          return prev + chunk;
        });
        view.dispatch({
          changes: [{ from: view.state.doc.length, insert: chunk }],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, view, perCharacterDelay]);

  return [current, current.length === text.length];
};

// Queue<string> ----> Tf[string -> string] ---> CM

/**
 * Streams text, yielding complete XML blocks as chunks when detected.
 * XML blocks are contiguous sections that may be nested but don't have more than one consecutive line break.
 */
export async function* streamText(text: string, delay: number) {
  let i = 0;
  while (i < text.length) {
    // Check if at the start of an XML tag.
    if (text[i] === '<' && i + 1 < text.length && text[i + 1] !== '/') {
      const xmlBlock = extractXmlBlock(text, i);
      if (xmlBlock) {
        yield xmlBlock;
        i += xmlBlock.length;
        await sleep(delay);
        continue;
      }
    }

    // Not an XML block, yield single character.
    yield text[i++];
    await sleep(delay);
  }
}

/**
 * Extracts a contiguous XML block starting from the given position.
 * Returns null if no valid XML block is found.
 */
// TODO(burdon): Reuse lezer?
export function extractXmlBlock(text: string, startPos: number): string | null {
  if (text[startPos] !== '<') {
    return null;
  }

  // Find the tag name.
  let tagEnd = startPos + 1;
  while (tagEnd < text.length && text[tagEnd] !== '>' && text[tagEnd] !== ' ') {
    tagEnd++;
  }

  if (tagEnd >= text.length) {
    return null;
  }

  const tagName = text.slice(startPos + 1, tagEnd);

  // Skip to the end of the opening tag.
  let pos = tagEnd;
  while (pos < text.length && text[pos] !== '>') {
    pos++;
  }

  if (pos >= text.length) {
    return null;
  }

  pos++; // Move past the '>'

  // Self-closing tag.
  if (text[pos - 2] === '/') {
    return text.slice(startPos, pos);
  }

  let tagDepth = 1;
  let consecutiveLineBreaks = 0;

  while (pos < text.length && tagDepth > 0) {
    const char = text[pos];

    // Track consecutive line breaks.
    if (char === '\n') {
      consecutiveLineBreaks++;
      if (consecutiveLineBreaks > 1) {
        // More than one consecutive line break - not a valid XML block.
        return null;
      }
    } else if (char !== '\r') {
      consecutiveLineBreaks = 0;
    }

    // Check for opening or closing tags.
    if (char === '<') {
      if (pos + 1 < text.length && text[pos + 1] === '/') {
        // Closing tag
        const closeTagStart = pos + 2;
        let closeTagEnd = closeTagStart;
        while (closeTagEnd < text.length && text[closeTagEnd] !== '>') {
          closeTagEnd++;
        }

        if (closeTagEnd < text.length) {
          const closeTagName = text.slice(closeTagStart, closeTagEnd);
          if (closeTagName === tagName) {
            tagDepth--;
            pos = closeTagEnd + 1;
            continue;
          }
        }
      } else {
        // Opening tag - check if it's the same tag name.
        let openTagEnd = pos + 1;
        while (openTagEnd < text.length && text[openTagEnd] !== '>' && text[openTagEnd] !== ' ') {
          openTagEnd++;
        }

        if (openTagEnd < text.length) {
          const openTagName = text.slice(pos + 1, openTagEnd);
          if (openTagName === tagName) {
            // Find the end of this opening tag.
            while (openTagEnd < text.length && text[openTagEnd] !== '>') {
              openTagEnd++;
            }
            if (openTagEnd < text.length && text[openTagEnd - 1] !== '/') {
              tagDepth++;
            }
            pos = openTagEnd + 1;
            continue;
          }
        }
      }
    }

    pos++;
  }

  if (tagDepth === 0) {
    return text.slice(startPos, pos);
  }

  return null;
}
