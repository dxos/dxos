# @dxos/markdown

HTML to Markdown conversion and text normalization utilities.

## Example

```ts
import { normalizeText } from '@dxos/markdown';

const markdown = normalizeText('<p>Hello <strong>world</strong></p>');
// "Hello **world**"
```
