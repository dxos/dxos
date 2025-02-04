//
// Copyright 2025 DXOS.org
//

export type Block = TextBlock | TagBlock | CodeBlock;

export type TextBlock = {
  type: 'text';
  content: string;
};

export type TagBlock = {
  type: 'tag';
  name: string;
  content: string;
  attributes: Record<string, string>;
  selfClosing: boolean;
};

export type CodeBlock = {
  type: 'code';
  language: string;
  content: string;
};

/**
 * Permissive streaming parser for XML content and plain text.
 */
export class StreamingParser {
  private buffer = '';

  constructor(private readonly onBlock: (block: Block) => void) {}

  /**
   * Write a chunk of text to the parser.
   */
  write(chunk: string) {
    this.buffer += chunk;
    this.processBuffer();
  }

  /**
   * Signal that no more input will be written.
   */
  end() {
    if (this.buffer.length > 0) {
      this.emitTextBlock(this.buffer);
      this.buffer = '';
    }
  }

  private processBuffer() {
    while (this.buffer.length > 0) {
      // Try to parse code block first.
      if (this.tryParseCodeBlock()) {
        continue;
      }

      // If no tag start found, keep buffering.
      const tagStartIndex = this.buffer.indexOf('<');
      if (tagStartIndex === -1) {
        return;
      }

      // Emit any text before the tag.
      if (tagStartIndex > 0) {
        this.emitTextBlock(this.buffer.slice(0, tagStartIndex));
        this.buffer = this.buffer.slice(tagStartIndex);
        continue;
      }

      // If incomplete tag, keep buffering.
      const tagEndIndex = this.buffer.indexOf('>', tagStartIndex);
      if (tagEndIndex === -1) {
        return;
      }

      // Check if this is a self-closing tag.
      const isSelfClosing = this.buffer[tagEndIndex - 1] === '/';
      const actualTagEndIndex = isSelfClosing ? tagEndIndex - 1 : tagEndIndex;

      // Parse the tag name and attributes.
      const tagContent = this.buffer.slice(tagStartIndex + 1, actualTagEndIndex).trim();
      const [tagName, ...attrParts] = tagContent.split(/\s+/);
      const attributes = this.parseAttributes(attrParts.join(' '));

      if (isSelfClosing) {
        this.emitTagBlock(tagName, '', attributes, true);
        this.buffer = this.buffer.slice(tagEndIndex + 1);
        continue;
      }

      // If no closing tag yet, keep buffering.
      const closingTagIndex = this.buffer.indexOf('</' + tagName + '>', tagEndIndex);
      if (closingTagIndex === -1) {
        return;
      }

      // Complete tag.
      const content = this.buffer.slice(tagEndIndex + 1, closingTagIndex);
      this.emitTagBlock(tagName, content, attributes, false);
      this.buffer = this.buffer.slice(closingTagIndex + tagName.length + 3); // +3 for '</>'
    }
  }

  private tryParseCodeBlock(): boolean {
    const codeBlockStart = this.buffer.indexOf('```');
    if (codeBlockStart === -1) {
      return false;
    }

    // If there's text before the code block, emit it first.
    if (codeBlockStart > 0) {
      this.emitTextBlock(this.buffer.slice(0, codeBlockStart));
      this.buffer = this.buffer.slice(codeBlockStart);
      return true;
    }

    // Look for the closing fence.
    const nextNewline = this.buffer.indexOf('\n', codeBlockStart);
    if (nextNewline === -1) {
      return false; // Incomplete, keep buffering.
    }

    const codeBlockEnd = this.buffer.indexOf('\n```', nextNewline);
    if (codeBlockEnd === -1) {
      return false; // No closing fence yet, keep buffering.
    }

    // Extract language (if specified) and content.
    const languageLine = this.buffer.slice(3, nextNewline).trim();
    const content = this.buffer.slice(nextNewline + 1, codeBlockEnd);

    this.emitCodeBlock(languageLine, content);
    this.buffer = this.buffer.slice(codeBlockEnd + 4); // +4 for '\n```'
    return true;
  }

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

  private emitTextBlock(text: string) {
    if (text.trim().length > 0) {
      this.onBlock({
        type: 'text',
        content: text,
      });
    }
  }

  private emitTagBlock(name: string, content: string, attributes: Record<string, string>, selfClosing: boolean) {
    this.onBlock({
      type: 'tag',
      name,
      content: content.trim(),
      attributes,
      selfClosing,
    });
  }

  private emitCodeBlock(language: string, content: string) {
    this.onBlock({
      type: 'code',
      language,
      content: content.trim(),
    });
  }
}
