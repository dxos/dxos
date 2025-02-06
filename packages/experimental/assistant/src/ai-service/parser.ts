//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { safeParseJson } from '@dxos/util';

export type Block = TextBlock | JsonBlock | CodeBlock | TagBlock;

/**
 * Plain text.
 */
export type TextBlock = {
  type: 'text';
  content: string;
};

/**
 * Raw JSON block.
 */
export type JsonBlock = {
  type: 'json';
  data: any;
};

/**
 * Fenced markdown code block.
 */
export type CodeBlock = {
  type: 'code';
  language: string;
  content: string;
};

/**
 * XML tag.
 */
export type TagBlock = {
  type: 'tag';
  name: string;
  content: string;
  attributes: Record<string, string>;
  selfClosing: boolean;
};

/**
 * Permissive streaming parser for XML fragments, markdown fenced code blocks, JSON, and plain text.
 */
export class StreamingParser {
  public readonly update = new Event<Block>();

  private _tag: string | undefined;
  private _buffer = '';

  /**
   * Current tag name if processing a tag.
   */
  get tag() {
    return this._tag;
  }

  /**
   * Current buffer.
   */
  get buffer() {
    return this._buffer;
  }

  /**
   * Write a chunk of text to the parser.
   */
  write(chunk: string) {
    this._buffer += chunk;
    this.processBuffer();
  }

  /**
   * Signal that no more input will be written.
   */
  end() {
    if (this._buffer.length > 0) {
      this.emitTextOrJsonBlock(this._buffer);
      this._buffer = '';
    }
  }

  private processBuffer() {
    while (this._buffer.length > 0) {
      // Try to parse code block first.
      if (this.tryParseCodeBlock()) {
        this._tag = undefined;
        continue;
      }

      // TODO(burdon): Use sax to heandle nested tags.
      // If no tag start found, keep buffering.
      const tagStartIndex = this._buffer.indexOf('<');
      if (tagStartIndex === -1) {
        this._tag = undefined;
        return;
      }

      // Emit any text before the tag.
      if (tagStartIndex > 0) {
        this.emitTextOrJsonBlock(this._buffer.slice(0, tagStartIndex));
        this._buffer = this._buffer.slice(tagStartIndex);
        continue;
      }

      // If incomplete tag, keep buffering.
      const tagEndIndex = this._buffer.indexOf('>', tagStartIndex);
      if (tagEndIndex === -1) {
        return;
      }

      // Check if this is a self-closing tag.
      const isSelfClosing = this._buffer[tagEndIndex - 1] === '/';
      const actualTagEndIndex = isSelfClosing ? tagEndIndex - 1 : tagEndIndex;

      // Parse the tag name and attributes.
      const tagContent = this._buffer.slice(tagStartIndex + 1, actualTagEndIndex).trim();
      const [tagName, ...attrParts] = tagContent.split(/\s+/);
      const attributes = this.parseAttributes(attrParts.join(' '));
      this._tag = tagName;

      // Self-closing tag.
      if (isSelfClosing) {
        this.emitTagBlock(tagName, '', attributes, true);
        this._buffer = this._buffer.slice(tagEndIndex + 1);
        continue;
      }

      // If no closing tag yet, keep buffering.
      const closingTagIndex = this._buffer.indexOf('</' + tagName + '>', tagEndIndex);
      if (closingTagIndex === -1) {
        return;
      }

      // Complete tag.
      const content = this._buffer.slice(tagEndIndex + 1, closingTagIndex);
      this.emitTagBlock(tagName, content, attributes, false);
      this._buffer = this._buffer.slice(closingTagIndex + tagName.length + 3); // +3 for '</>'
      this._tag = undefined;
    }
  }

  /**
   * Try to parse a code block.
   */
  private tryParseCodeBlock(): boolean {
    const codeBlockStart = this._buffer.indexOf('```');
    if (codeBlockStart === -1) {
      return false;
    }

    // If there's text before the code block, emit it first.
    if (codeBlockStart > 0) {
      this.emitTextOrJsonBlock(this._buffer.slice(0, codeBlockStart));
      this._buffer = this._buffer.slice(codeBlockStart);
      return true;
    }

    // Look for the closing fence.
    const nextNewline = this._buffer.indexOf('\n', codeBlockStart);
    if (nextNewline === -1) {
      return false; // Incomplete, keep buffering.
    }

    const codeBlockEnd = this._buffer.indexOf('\n```', nextNewline);
    if (codeBlockEnd === -1) {
      return false; // No closing fence yet, keep buffering.
    }

    // Extract language (if specified) and content.
    const languageLine = this._buffer.slice(3, nextNewline).trim();
    const content = this._buffer.slice(nextNewline + 1, codeBlockEnd);

    this.emitCodeBlock(languageLine, content);
    this._buffer = this._buffer.slice(codeBlockEnd + 4); // +4 for '\n```'
    return true;
  }

  /**
   * Parse the attributes of a tag.
   */
  private parseAttributes(attrString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    if (!attrString) {
      return attributes;
    }

    // Match attribute patterns like: name="value" or name='value' or name=value.
    const attrPattern = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;

    let match;
    while ((match = attrPattern.exec(attrString)) !== null) {
      const [, name, doubleQuoted, singleQuoted, unquoted] = match;
      attributes[name] = doubleQuoted ?? singleQuoted ?? unquoted;
    }

    return attributes;
  }

  //
  // Emitters
  //

  private emitTextOrJsonBlock(content: string) {
    const text = content.trim();
    if (text.length > 0) {
      if (text.startsWith('{') && text.endsWith('}')) {
        const data = safeParseJson(text);
        if (data) {
          this.update.emit({
            type: 'json',
            data,
          });
          return;
        }
      }

      this.update.emit({
        type: 'text',
        content: text,
      });
    }
  }

  private emitCodeBlock(language: string, content: string) {
    this.update.emit({
      type: 'code',
      language,
      content: content.trim(),
    });
  }

  private emitTagBlock(name: string, content: string, attributes: Record<string, string>, selfClosing: boolean) {
    this.update.emit({
      type: 'tag',
      name,
      content: content.trim(),
      attributes,
      selfClosing,
    });
  }
}
