//
// Copyright 2026 DXOS.org
//

/**
 * Tree-sitter grammar for the body of a DEUS ```mdl fence: a header line `<type> [<id>][: <title>]`, then indented
 * `key[?]: value` fields, `- item` lines, `#` comments and prose. The external scanner classifies each line before it
 * is parsed, since only a look at the whole line tells a field from prose, and a `key: |` block scalar makes the
 * deeper lines below it prose whatever they look like.
 */
module.exports = grammar({
  name: 'mdl',

  extras: () => [],

  externals: ($) => [$._header_start, $._field_start, $._comment_start, $._item_start, $._text_start, $._blank_start],

  rules: {
    block: ($) => seq(optional($.header), repeat($._line)),

    // `<type> [<id>] [<label>][: <title> | # comment]`; specs also write `type Repo  # note` and `scenario X operation`.
    header: ($) =>
      seq(
        $._header_start,
        field('type', $.block_type),
        optional(field('id', alias($._header_id, $.identifier))),
        optional(field('label', $.label)),
        optional(
          choice(
            seq(alias($._header_colon, ':'), optional($._space), optional(field('title', $.title))),
            alias($._header_comment, $.comment),
          ),
        ),
        $._eol,
      ),

    // The id and label tokens carry their leading whitespace, so the id wins over a label that starts at the same place.
    _header_id: () => token(prec(2, /[ \t]+[^\s:#]+/)),
    label: () => token(prec(1, /[ \t]+[^\s:#][^\n:#]*/)),
    _header_colon: () => token(/[ \t]*:/),
    _header_comment: () => token(/[ \t]*#[^\n]*/),

    _line: ($) => choice($.field, $.comment_line, $.list_item, $.text_line, $._blank_line),

    field: ($) =>
      seq(
        $._field_start,
        field('key', $.key),
        optional(seq($._space, field('id', $.identifier))),
        optional('?'),
        ':',
        optional(field('value', $.value)),
        $._eol,
      ),

    comment_line: ($) => seq($._comment_start, $.comment, $._eol),

    list_item: ($) => seq($._item_start, '-', optional(field('value', $.value)), $._eol),

    text_line: ($) => seq($._text_start, $.text, $._eol),

    _blank_line: ($) => seq($._blank_start, optional($._space), $._eol),

    // A value is inline tokens; a `#` comment counts only after whitespace, as in YAML, so `pull/1#r2` stays whole.
    value: ($) => repeat1(choice($._inline, alias('#', $.word), seq($._space, optional($.comment)))),

    // Prose: a block scalar's body, or a line that is neither a field nor an item. `#` is text here.
    text: ($) => repeat1(choice($._inline, $._space, alias('#', $.word))),

    _inline: ($) =>
      choice(
        $.source_key,
        $.spec_ref,
        $.actor,
        $.number,
        $.word,
        alias('|', $.operator),
        alias(choice('[', ']'), $.bracket),
        alias(',', $.delimiter),
        alias(/[:?]/, $.word),
      ),

    block_type: () => /[A-Za-z][\w-]*/,
    identifier: () => /[A-Za-z0-9$][\w.$-]*/,
    key: () => /[A-Za-z_][\w-]*/,
    title: () => /[^\n]+/,
    comment: () => /#[^\n]*/,

    // A `github:owner/repo/path[#fragment]` key, as deus `SOURCE_KEY_PATTERN` matches it, less a sentence's final period.
    source_key: () => token(prec(3, /github:[\w.-]+\/[\w.-]+\/[\w./@+-]*[\w/@+-](#[\w$.-]*[\w$])?/)),
    // A `<spec id>#<item>` reference, as deus `refs.ts` matches it.
    spec_ref: () => token(prec(2, /[a-z][a-z0-9-]*(\.[a-zA-Z0-9-]+)+#[\w$.-]*\w/)),
    // The `user:` or `agent:` of a decision's actor.
    actor: () => token(prec(2, /(user|agent):[^\s,\]]+/)),
    number: () => token(prec(1, /\d+(\.\.\d+)?/)),
    word: () => /[^\s\[\],|#:?]+/,

    _space: () => /[ \t]+/,
    _eol: () => /\r?\n/,
  },
});
