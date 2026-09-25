---
'@dxos/plugin-connector': patch
---

Fixed a connection created through a redirected OAuth popup never binding to the object it started from. The in-flight snapshot stored the sync target as `Ref.uri` — an `echo:` EID — and read it back with `DXN.tryMake`, which only matches a dotted `dxn:` name, so recovery always produced a broken reference and the binding step failed silently. A mailbox connected that way kept offering **Connect** instead of **Sync**, because both actions key on the same missing cursor.

Recovery now reads both snapshot fields with `EID.tryParse`, and refuses to continue when a snapshot names a target it cannot parse rather than treating it as "no target" — that path would materialize a fresh root and bind that instead, leaving the user's own object unbound.
