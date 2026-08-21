---
name: no-compat-shims
description: >-
  Moving, renaming, or deleting an exported symbol or module. Use whenever code
  changes location: a file moves between packages, an export is renamed, a helper
  is extracted, or a module is deleted, and callers elsewhere still import the old
  path. Covers what to do with those callers and what must not be left behind at
  the old location, including when the change is urgent.
---

# Moving code without leaving a shim behind

When code moves, **every call site is updated in the same change**. Do not leave a
compatibility re-export, an alias, or a deprecated forwarding stub at the old
location.

- Inventory the callers, migrate them all, and delete the old module in the same
  change.
- A re-export left "temporarily" is permanent in practice: nothing forces the
  follow-up, and the next reader cannot tell which path is canonical.
- Genuine barrel or `index.ts` public-API re-exports are not shims. A file whose
  only remaining content forwards to the new location is.
- Urgency does not change this. A deadline is the usual reason a shim gets left,
  and the usual reason it is never removed. Migrate the callers; it is mechanical.
- If callers are genuinely unreachable (another team, another repo), say so
  explicitly and name what you left rather than leaving it silently.
