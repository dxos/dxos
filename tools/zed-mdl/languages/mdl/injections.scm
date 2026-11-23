; ```mdl fences get the fence-body grammar; other fences their own language.
((fenced_code_block
  (info_string (language) @_language)
  (code_fence_content) @injection.content)
  (#eq? @_language "mdl")
  (#set! injection.language "MDL Block"))

((fenced_code_block
  (info_string (language) @injection.language)
  (code_fence_content) @injection.content)
  (#not-eq? @injection.language "mdl"))

((inline) @injection.content
  (#set! injection.language "markdown-inline"))

((minus_metadata) @injection.content
  (#set! injection.language "yaml"))
