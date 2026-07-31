# @dxos/react-ui-html

Sandboxed rendering of untrusted HTML.

`Html` attaches sanitized content to a Shadow DOM host so the content's CSS cannot reach the app,
while the content still flows in the app layout (no iframe, no height measurement). Remote images are
blocked by default so tracking pixels don't load.

Content-specific behaviour belongs to the caller, not this package:

- `transforms` mutate the attached subtree (e.g. recolor to the theme, collapse quoted replies).
- `resolveSrc` resolves non-http `src` references (e.g. `cid:` inline attachments).

See `@dxos/plugin-inbox`'s `HtmlViewer` for the email composition of both.
