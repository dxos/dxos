# `dx-*` selection / navigation grammar

Companion to `selected.css`. The four selection-state utilities below are
each bound to a specific ARIA attribute (or `data-*`) selector. **The
class only fires when the matching ARIA attribute is set on the same
element.** Mismatches (e.g. `dx-current` paired with `aria-selected`)
silently render as a plain row.

| Class            | Bound selector         | Pair with                          | Use when                                                                                                                                                                                                    |
| ---------------- | ---------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dx-hover`       | `hover:`               | (no ARIA — pure visual affordance) | Always, on any clickable row. Adds the cursor + hover bg/text.                                                                                                                                              |
| `dx-selected`    | `aria-selected:`       | `aria-selected={boolean}`          | A row is "the chosen one" driving a master/detail panel. Listbox / option pattern. Multi-select OK.                                                                                                         |
| `dx-current`     | `aria-[current=true]:` | `aria-current='true'`              | A row is "where you are" in a navigation set (current page, current step). At most one current per group. The CSS variant fires only on `aria-current='true'`, so use that literal even on `<a>`/nav links. |
| `dx-highlighted` | `data-[highlighted]:`  | Radix `data-highlighted` (managed) | A Radix-managed transient highlight (menu / combobox active option). Don't set the attribute manually.                                                                                                      |

## Rules

1. **Never combine `dx-selected` and `dx-current` on the same element**
   unless you also set both `aria-selected` and `aria-current`. They
   express different things (chosen vs you-are-here) and the visual
   weight is similar enough that combining them defeats both.
2. **`aria-pressed`, `aria-checked`, `aria-expanded`, `aria-disabled`
   are not selection-row attributes.** None of the `dx-*` selection
   utilities pair with them. Toggle buttons (mute/unmute) want
   `aria-pressed`; a selection row wants `aria-selected`.
3. **`aria-selected` is only valid on roles that admit it** — `option`,
   `tab`, `gridcell`, `row`, `treeitem`, `columnheader`, `rowheader`.
   On a plain `<button>` inside a `<ul role='listbox'>`, give the button
   `role='option'` so assistive tech sees the attribute.
4. **`dx-active` does not exist.** If you see it in code it's a no-op
   string. Use `dx-selected` (selection) or `dx-current` (navigation)
   instead.
5. **Set ARIA before adding the class.** The class is inert without
   the attribute; it's not a fallback styler. Reviewers should reject
   PRs that add `dx-selected` without `aria-selected`.

## Canonical patterns

### Selectable row in a list (master/detail)

```tsx
<ul role='listbox' aria-label='…'>
  {items.map((item) => (
    <li key={item.id} role='presentation'>
      <button
        type='button'
        role='option'
        aria-selected={item.id === selectedId}
        className='dx-hover dx-selected'
        onClick={() => onSelect(item.id)}
      >
        {item.label}
      </button>
    </li>
  ))}
</ul>
```

### "You are here" in a navigation list

```tsx
<nav>
  <ul>
    {pages.map((page) => (
      <li key={page.href}>
        <a
          href={page.href}
          aria-current={page.href === currentHref ? 'true' : undefined}
          className='dx-hover dx-current'
        >
          {page.label}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

### Toggle button (NOT a row)

Don't reach for `dx-selected` here. Toggle buttons want their own
visual treatment via `aria-pressed:` variants — out of scope for this
file.

```tsx
<button type='button' aria-pressed={muted} onClick={toggleMute}>
  {muted ? 'Unmute' : 'Mute'}
</button>
```

## Enforcing the grammar

A future ESLint rule could flag:

- `dx-selected` without `aria-selected` on the same element.
- `dx-current` without `aria-current` on the same element.
- `dx-active` literal anywhere.

Until that exists, reviewers and the `react-ui-list` `RowList` /
`CardList` containers (which set both attribute and class together)
are the enforcement.
