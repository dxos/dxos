//
// Copyright 2026 DXOS.org
//
// External scanner for the mdl grammar: classifies each line at its start. It consumes the line's indentation and
// then peeks ahead (past `mark_end`) to tell a header, a field, an item, a comment and prose apart, and remembers the
// indentation of a `key: |` or `key: >` field so the deeper lines below it read as prose.
//

#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

enum TokenType { HEADER_START, FIELD_START, COMMENT_START, ITEM_START, TEXT_START, BLANK_START };

typedef struct {
  /** The indentation of the open block scalar's field, or -1 when no scalar is open. */
  int16_t scalar_indent;
  /** Whether a line was scanned; only the first line can be the header. */
  bool started;
} Scanner;

static bool is_alpha(int32_t c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }

static bool is_digit(int32_t c) { return c >= '0' && c <= '9'; }

static bool is_word(int32_t c) { return is_alpha(c) || is_digit(c) || c == '_' || c == '-'; }

static bool is_space(int32_t c) { return c == ' ' || c == '\t'; }

static bool is_eol(TSLexer *lexer) { return lexer->lookahead == '\n' || lexer->lookahead == '\r' || lexer->eof(lexer); }

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static void skip_spaces(TSLexer *lexer) {
  while (is_space(lexer->lookahead)) {
    advance(lexer);
  }
}

/**
 * Whether the rest of the line is `key[ id][?]:` followed by whitespace or the end of the line; sets `*scalar` when
 * the value is a block scalar indicator (`|` or `>`, optionally with a comment).
 */
static bool scan_field(TSLexer *lexer, bool *scalar) {
  if (!(is_alpha(lexer->lookahead) || lexer->lookahead == '_')) {
    return false;
  }
  while (is_word(lexer->lookahead)) {
    advance(lexer);
  }
  if (is_space(lexer->lookahead)) {
    // A nested id, as in `req F-1.1:`.
    skip_spaces(lexer);
    if (!(is_alpha(lexer->lookahead) || is_digit(lexer->lookahead) || lexer->lookahead == '$')) {
      return false;
    }
    while (is_word(lexer->lookahead) || lexer->lookahead == '.' || lexer->lookahead == '$') {
      advance(lexer);
    }
  }
  if (lexer->lookahead == '?') {
    advance(lexer);
  }
  if (lexer->lookahead != ':') {
    return false;
  }
  advance(lexer);
  if (!(is_space(lexer->lookahead) || is_eol(lexer))) {
    return false;
  }
  skip_spaces(lexer);
  if (lexer->lookahead == '|' || lexer->lookahead == '>') {
    advance(lexer);
    while (lexer->lookahead == '-' || lexer->lookahead == '+' || is_digit(lexer->lookahead)) {
      advance(lexer);
    }
    skip_spaces(lexer);
    *scalar = is_eol(lexer) || lexer->lookahead == '#';
  }
  return true;
}

void *tree_sitter_mdl_external_scanner_create(void) {
  Scanner *scanner = calloc(1, sizeof(Scanner));
  scanner->scalar_indent = -1;
  return scanner;
}

void tree_sitter_mdl_external_scanner_destroy(void *payload) { free(payload); }

unsigned tree_sitter_mdl_external_scanner_serialize(void *payload, char *buffer) {
  memcpy(buffer, payload, sizeof(Scanner));
  return sizeof(Scanner);
}

void tree_sitter_mdl_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = payload;
  if (length == sizeof(Scanner)) {
    memcpy(scanner, buffer, sizeof(Scanner));
  } else {
    scanner->scalar_indent = -1;
    scanner->started = false;
  }
}

bool tree_sitter_mdl_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = payload;
  // Every line token starts a line; in error recovery all symbols are valid, which this check also covers.
  if (lexer->get_column(lexer) != 0 || lexer->eof(lexer) || !valid_symbols[TEXT_START]) {
    return false;
  }

  bool first_line = !scanner->started;
  scanner->started = true;
  int16_t indent = 0;
  while (is_space(lexer->lookahead)) {
    indent += lexer->lookahead == '\t' ? 4 : 1;
    advance(lexer);
  }
  // The token is the indentation; everything after it is only looked at.
  lexer->mark_end(lexer);

  if (is_eol(lexer)) {
    lexer->result_symbol = BLANK_START;
    return true;
  }
  if (scanner->scalar_indent >= 0 && indent > scanner->scalar_indent) {
    lexer->result_symbol = TEXT_START;
    return true;
  }
  scanner->scalar_indent = -1;

  int32_t first = lexer->lookahead;
  if (first_line && valid_symbols[HEADER_START] && indent == 0 && is_alpha(first)) {
    lexer->result_symbol = HEADER_START;
    return true;
  }
  if (first == '#') {
    lexer->result_symbol = COMMENT_START;
    return true;
  }
  if (first == '-') {
    advance(lexer);
    if (is_space(lexer->lookahead) || is_eol(lexer)) {
      lexer->result_symbol = ITEM_START;
      return true;
    }
    lexer->result_symbol = TEXT_START;
    return true;
  }
  bool scalar = false;
  if (scan_field(lexer, &scalar)) {
    if (scalar) {
      scanner->scalar_indent = indent;
    }
    lexer->result_symbol = FIELD_START;
    return true;
  }
  lexer->result_symbol = TEXT_START;
  return true;
}
