---
'@dxos/react-focus': patch
---

Hotkey conflict warnings now account for scopes. Registering a binding goes through the new `registerHotkey` export, which reports a collision only when the two commands' scopes can be active at once — the same scope, an ancestor against a descendant, or an unscoped command against anything.

Ark's own check compares the hotkey and the DOM target only, so one action bound per space (`space.rename` on `shift+F6`, say) warned once per pair of spaces on every graph sync. `createHotkeyStore` is now a DXOS wrapper that puts the store on `conflictBehavior: 'allow'` so those warnings come from `registerHotkey` instead.
