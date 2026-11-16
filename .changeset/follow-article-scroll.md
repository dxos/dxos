---
'@dxos/app-toolkit': minor
'@dxos/plugin-assistant': patch
'@dxos/plugin-deck': patch
'@dxos/plugin-space': patch
'@dxos/react-ui': minor
'@dxos/react-ui-attention': minor
---

A follower now lands where the leader is scrolled in any article that scrolls in a `ScrollArea`, with no follow code in its plugin. Each plank keeps its article's scroll as `ScrollPosition` view state under the object's EID, so an article also comes back where you left it when its plank remounts. `ScrollArea.Tracking` keeps the scroll of the outermost `ScrollArea.Viewport` inside it, and of any viewport given a `follow` name; `follow={false}` opts a viewport out. A position is the element at the top marked `data-scroll-anchor` or `data-object-id`, with the offset past it, else the fraction scrolled, so a follower with a narrower window lands on the same item. A `ViewState` aspect can follow only some fields with `follow: { policy: 'write', fields }`, and the follower keeps the rest of its own value. `Manager.subscribe` passes whether a value came from a follow, and a followed aspect keyed by something other than an EID logs a warning. A session sends its followed view state only while it is followed. `HomeSection.Root` takes an `anchor`, and Home's sections pass one, so a follower whose Home is a different width keeps the leader's section at the top.
