//
// Copyright 2026 DXOS.org
//

import { type URI } from '@dxos/keys';
import { type MessageRenderer, isPrompt } from '@dxos/react-ui-feed';
import { type ContentBlock, type Message } from '@dxos/types';

import { type ChatView } from './types';

export type CreateRendererOptions = {
  /** Resolves a reference's display label; the tag carries the DXN either way. */
  getObjectLabel?: (uri: URI.URI) => string;
};

/**
 * The assistant's projection of a message: each block flattened to markdown, everything that is not
 * prose emitted as an XML tag for the registry's widgets. The view type is a filter over blocks —
 * the model always carries everything, so switching views is a re-render, not a re-fetch.
 *
 * Consecutive tool blocks (`toolCall`/`toolResult`/`stats`) — along with the `status` and `reasoning`
 * blocks that narrate them — render as ONE `<toolkit>` tag carrying the run as JSON: the panel
 * widget shows a run of calls as tabs, and the item is rebuilt from its message alone — there is no
 * side channel accumulating widget state (the old `MessageSyncer` machinery this package retires).
 *
 * Narration opens a run of its own where no call follows, so a turn the model spends only saying
 * what it is doing reads as one panel rather than a widget per block — and a call arriving later
 * lands in the panel the status already opened instead of displacing it.
 */
export const createRenderer = (
  viewType: ChatView | undefined,
  { getObjectLabel = () => 'Object' }: CreateRendererOptions = {},
): MessageRenderer => {
  return (message) => {
    const blocks = message.blocks.filter((block) => isBlockVisible(viewType, block));
    const segments: string[] = [];
    let run: ContentBlock.Any[] = [];

    // Emitted after the run they interleave with, so the panel stays whole.
    let deferred: string[] = [];

    const flushRun = () => {
      if (run.length) {
        segments.push(toolkitTag(run));
        run = [];
      }
      if (deferred.length) {
        segments.push(...deferred);
        deferred = [];
      }
    };

    for (const block of blocks) {
      if (block._tag === 'toolCall' || block._tag === 'toolResult') {
        run.push(block);
        continue;
      }

      // Status and reasoning narrate the run they sit in, and a run of narration alone is still one
      // step the reader took in: emitted as their own widgets they split what happened between two
      // sentences of prose into a row per block.
      if (block._tag === 'status' || block._tag === 'reasoning') {
        // A block with no prose renders no row, and opening a run on one would reserve a panel with
        // nothing in it.
        if (narrationText(block).length) {
          run.push(block);
        }
        continue;
      }

      // Stats belong to their own widget, not the tool panel — but they arrive mid-run, so they
      // must not flush it either, or a run becomes one panel per call again.
      if (block._tag === 'stats') {
        const rendered = blockToMarkdown(message, block, getObjectLabel);
        if (rendered) {
          deferred.push(rendered);
        }
        continue;
      }

      // Rendered BEFORE the flush: a block that renders to nothing must not end the run. The
      // runtime interleaves empty text blocks with tool calls, and flushing on one split a single
      // run into a panel per call with nothing visible between them.
      const rendered = blockToMarkdown(message, block, getObjectLabel);
      if (!rendered) {
        continue;
      }

      flushRun();
      segments.push(rendered);
    }
    flushRun();

    // A run of suggestions joins on one line so the chips flow; everything else is separated by a
    // blank line so it parses as its own markdown block. No separator character between chips,
    // because `break-spaces` does not hang a space at a line break — it would indent the next row.
    const text = segments
      .reduce<string[]>((parts, segment) => {
        const previous = parts[parts.length - 1];
        if (previous?.startsWith('<suggestion') && segment.startsWith('<suggestion')) {
          parts[parts.length - 1] = `${previous}${segment}`;
        } else {
          parts.push(segment);
        }
        return parts;
      }, [])
      .join('\n\n');

    return { kind: 'markdown', text };
  };
};

const isBlockVisible = (viewType: ChatView | undefined, block: ContentBlock.Any): boolean => {
  switch (viewType) {
    case 'debug':
      return true;
    case 'summary':
      // Only conversational text; hide reasoning, tool calls, status, stats and synthetic turns.
      return block._tag === 'text' && (block as ContentBlock.Text).disposition !== 'synthetic';
    case 'normal':
      return block._tag !== 'reasoning';
    case 'thinking':
    default:
      return true;
  }
};

const blockToMarkdown = (
  message: Message.Message,
  block: ContentBlock.Any,
  getObjectLabel: (uri: URI.URI) => string,
): string | undefined => {
  switch (block._tag) {
    case 'text': {
      // The disposition marks system-generated input, not the sender: the thread folds a run of
      // machinery messages into one and keeps the FIRST message's identity, so an alarm turn's
      // synthetic prompt arrives on a message the previous turn's trailing `stats` made
      // assistant-role — and keying on the role rendered it as the model's own prose.
      if (block.disposition === 'synthetic') {
        // Synthetic context riding ON a prompt is the chrome's: it renders as its own panel above
        // the bubble, so the bubble frames only the reader's words. A message that is ONLY synthetic
        // is not the reader speaking at all (a trigger, a continuation nudge), so it renders as its
        // own panel row — emitted here, since a message the renderer maps to nothing is dropped as
        // an empty row, which left the answer to it reading as unprompted.
        return isPrompt(message) ? undefined : tag('synthetic', block.text, block);
      }
      if (message.sender.role === 'user') {
        return tag('prompt', block.text, block);
      }
      return block.text.trim() || undefined;
    }

    case 'summary':
      return tag('summary', block.content, block);

    case 'suggestion':
      return block.pending ? undefined : tag('suggestion', block.text, block);

    case 'select':
      return block.pending || !block.options.length
        ? undefined
        : `<select>${block.options.map((option) => `<option>${escapeXml(option)}</option>`).join('')}</select>`;

    case 'reference': {
      if (block.pending) {
        return undefined;
      }
      const uri = block.reference.uri;
      return `<reference ref="${escapeAttribute(uri.toString())}">${escapeXml(getObjectLabel(uri))}</reference>`;
    }

    case 'stats':
      // Only meaningful inside a tool run (grouped by the caller); bare stats render nothing.
      return undefined;

    case 'surface':
      return block.pending
        ? undefined
        : `<surface role="${escapeAttribute(block.role)}">${escapeXml(JSON.stringify(block.data ?? {}))}</surface>`;

    default:
      // Nothing renders blank: an unknown block is shown as what it is.
      return tag('json', JSON.stringify(block), block);
  }
};

/** The prose a narration block carries; blank means the widget would render no row for it. */
const narrationText = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'status':
      return block.statusText?.trim() ?? '';
    case 'reasoning':
      return (block.reasoningText ?? block.redactedText ?? '').trim();
    default:
      return '';
  }
};

/** A run of tool blocks as one tag; the widget parses the payload back out. */
const toolkitTag = (blocks: ContentBlock.Any[]): string => {
  const pending = blocks.some((block) => block.pending);
  return `<toolkit${pending ? ' pending="true"' : ''}>${escapeXml(JSON.stringify(blocks))}</toolkit>`;
};

/**
 * An XML tag holding block content.
 *
 * A pending block is emitted **unclosed**, which is the streaming contract: the item reconciles by
 * appending, so a closing tag written before the content is complete would be rewritten per chunk.
 * Paragraph breaks inside tag content are collapsed, since a blank line would end the enclosing
 * markdown block and leave the rest of the tag parsing as prose.
 */
const tag = (name: string, content: string, block: ContentBlock.Any): string => {
  const text = escapeXml(content.replace(/\n\n+/g, ' ').trim());
  if (!text.length && !block.pending) {
    return '';
  }

  const open = `<${name}>`;
  return block.pending ? `${open}${text}` : `${open}${text}</${name}>`;
};

const escapeXml = (raw: string): string => raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = (raw: string): string => escapeXml(raw).replace(/"/g, '&quot;');

//
// Estimates
//

/** Chrome around every row: the padding and the hover toolbar's reserved line. */
const ROW_CHROME = 46;
/** Height of a wrapped line of body text, and how many characters fit at typical thread width. */
const LINE_HEIGHT = 24;
const LINE_CHARS = 90;
/** A collapsed panel: reasoning, a tool run, a summary. */
const PANEL_HEIGHT = 50;

/**
 * What a row will measure, from the message alone. Rough on purpose — its only job is to be close
 * enough that measuring the row does not move the rows below it.
 */
export const estimateRow = (message: Message.Message): number => {
  let height = ROW_CHROME;
  for (const block of message.blocks) {
    switch (block._tag) {
      case 'text': {
        if (block.disposition === 'synthetic') {
          // Rendered by the chrome as a collapsed context panel, not as text.
          height += PANEL_HEIGHT;
          break;
        }
        for (const paragraph of block.text.split('\n\n')) {
          height += Math.max(1, Math.ceil(paragraph.length / LINE_CHARS)) * LINE_HEIGHT;
        }
        break;
      }
      case 'suggestion':
        height += LINE_HEIGHT + 8;
        break;
      case 'select':
        height += block.options.length * (LINE_HEIGHT + 10);
        break;
      case 'toolResult':
      case 'stats':
        // Folded into the preceding call's panel.
        break;
      default:
        height += PANEL_HEIGHT;
    }
  }

  return height;
};
