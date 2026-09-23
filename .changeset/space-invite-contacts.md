---
'@dxos/react-ui': minor
'@dxos/plugin-space': minor
---

You can add people you already share a space with to another space: a contact picker on the space
members article admits them by identity key and returns a `?spaceKey=` join link, and the account
profile gains a Contacts article. `space.admitContact(contact, role?)` takes a role and now defaults
to Editor instead of Admin, and records the contact's profile on the member credential.

Breaking: `Clipboard` (`Clipboard.Button`, `Clipboard.IconButton`, `Clipboard.Provider`) and
`useClipboard` are removed from `@dxos/react-ui`; use `SystemIconButton.Clipboard` with `value` (or
`onCopy`), adding `iconOnly` for the icon-only form. It needs no provider.
