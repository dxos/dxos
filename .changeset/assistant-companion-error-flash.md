---
'@dxos/plugin-assistant': patch
---

Fixed two errors when opening the assistant companion: a momentary "Cannot read properties of null" flash while the chat was being provisioned (the companion now renders blank until it exists), and a "RovingFocusGroupItem must be used within RovingFocusGroup" crash when another plugin contributed a plain toolbar action to the prompt (the contributed items now render inside a toolbar context).
