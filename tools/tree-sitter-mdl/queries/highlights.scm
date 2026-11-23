; Highlights for the body of a ```mdl fence. Capture names follow the common tree-sitter set (Zed, Neovim, Helix).

(block_type) @keyword
(header id: (identifier) @function)
(header label: (label) @string.special)
(header title: (title) @title)

(field key: (key) @property)
(field id: (identifier) @function)
"?" @operator
":" @punctuation.delimiter
"-" @punctuation.list_marker

(comment) @comment

(source_key) @link_uri
(spec_ref) @link_uri
(actor) @constant
(number) @number

(operator) @operator
(bracket) @punctuation.bracket
(delimiter) @punctuation.delimiter

; Ids written in prose and values: `F-1.2`, `QA-3`, `D-12`.
((word) @constant
  (#match? @constant "^[A-Z]+-[0-9]+(\\.[0-9]+)*$"))

; Type atoms: a value that is one word, a member of an `a | b` union, or an item of a `[A, B]` list. Words in a
; prose value are left plain, so a capitalised sentence is not painted as types.
(field value: (value . (word) @type .))
(value (word) @type . (operator))
(value (operator) . (word) @type)
(value (bracket) . (word) @type)
(value (delimiter) . (word) @type)
((value (word) @type.builtin)
  (#match? @type.builtin "^(string|number|boolean|integer|Prose|RefList|Ref|Date|DateTime|URL|any|void)(\\[\\])?$"))

(text) @text
