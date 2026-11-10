; Block-level markdown; inline markup comes from the injected `Markdown-Inline` language.

[
  (atx_heading)
  (setext_heading)
] @title

[
  (atx_h1_marker)
  (atx_h2_marker)
  (atx_h3_marker)
  (atx_h4_marker)
  (atx_h5_marker)
  (atx_h6_marker)
  (setext_h1_underline)
  (setext_h2_underline)
  (thematic_break)
] @punctuation.special

[
  (list_marker_plus)
  (list_marker_minus)
  (list_marker_star)
  (list_marker_dot)
  (list_marker_parenthesis)
] @punctuation.list_marker

(block_quote_marker) @punctuation.special

(fenced_code_block_delimiter) @punctuation.embedded
(info_string) @label
(indented_code_block) @text.literal

(pipe_table_header (pipe_table_cell) @title)
"|" @punctuation.special

(link_label) @link_text
(link_destination) @link_uri
(link_title) @string

(minus_metadata) @comment
