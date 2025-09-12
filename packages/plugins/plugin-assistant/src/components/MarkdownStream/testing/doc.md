<prompt>Hello</prompt>

## Markdown

Markdown is a lightweight markup language used to format plain text in a simple and readable way. It allows you to create structured documents using conventions for headings, lists, emphasis (bold/italic), links, images, code, blockquotes, tables, and horizontal rules.

It’s widely used in:

- documentation
- note-taking
- online writing

There are task lists also:

- [ ] Not done
- [x] Done

Here are some options.

<select>
  <option>Option 1</option>
  <option>Option 2</option>
</select>

And some suggestions.

<suggestion>Retry</suggest>

Here is a tool call, result, and summary.

<toolBlock>
  <toolCall toolCallId="1234" name="search" input='{ query: "cats" }'/>
  <toolResult toolCallId="1234" name="search" result="This is a search result"/>
  <summary>OK (1.2ms)</summary>
</toolBlock>

This is a link <reference reference="dxn://example.com/123">DXOS</reference> which is inline.

Here is some JSON:

<json data='{ "key": "value" }' />

Markdown is designed to be human-readable, meaning that even without rendering, the text remains understandable. It’s highly portable and supported across many platforms like GitHub, documentation tools, blogging systems, and note-taking apps.

```json
{
  "hello": "world",
  "items": [1, 2, 3, 4, 5]
}
```

And tables:

| Column 1 | Column 2 |
| -------- | -------- |
| Item 1   | Item 2   |
| Item 3   | Item 4   |
| Item 5   | Item 6   |

There are also extended flavors of Markdown (like GitHub Flavored Markdown) that add features such as checkboxes, footnotes, and task lists, expanding its capabilities for more complex documents.

Markdown’s simplicity makes it ideal for writing structured content quickly while keeping the source clean and readable.

If you want, I can also break down how Markdown parsing actually works behind the scenes, which explains how these plain-text symbols get converted to formatted output. Do you want me to do that?
