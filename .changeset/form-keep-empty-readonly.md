---
'@dxos/react-ui-form': patch
---

Add a `hideEmpty` option to `Form` (default `true`) controlling whether empty-valued fields are omitted when read-only; set `hideEmpty={false}` to keep the full set of schema fields visible as static rows. Also disable the underlying `Select.Root` in `SelectField` when read-only so the popover no longer opens.
