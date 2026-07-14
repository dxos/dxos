---
'@dxos/react-ui-form': patch
---

Add a `keepEmptyReadonly` option to `Form` that keeps empty-valued fields visible when read-only (rendering the full set of schema fields as static rows) instead of omitting them. Also disable the underlying `Select.Root` in `SelectField` when read-only so the popover no longer opens.
