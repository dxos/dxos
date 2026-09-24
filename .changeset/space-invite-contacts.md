---
'@dxos/react-ui': minor
'@dxos/plugin-space': minor
---

Add people you already share a space with to another space: a contact picker on the space members
article admits them by identity key and returns a `?spaceKey=` join link that brings the guest into
the space, and the account profile gains a Contacts article. `space.admitContact(contact, role?)`
takes a role, defaults to Editor instead of Admin, and records the contact's profile; `Contact`
carries the contact's `did`. `Combobox.Item` forwards extra props, and `Listbox.ItemContent` sizes
its icon column to wider icons and accepts block content in `description`.

Breaking: `Clipboard` (`Clipboard.Button`, `Clipboard.IconButton`, `Clipboard.Provider`) and
`useClipboard` are removed from `@dxos/react-ui`; use `SystemIconButton.Clipboard` with `value` (or
`onCopy`), adding `iconOnly` for the icon-only form. It needs no provider.
