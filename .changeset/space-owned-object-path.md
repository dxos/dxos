---
# multiple-changesets: a slide's path through the collection tree, the slide editor's preview control and
# the deck's handover between two articles are three packages a reader would look up separately
'@dxos/plugin-space': patch
---

An object that no collection lists is now reachable through the object that owns it, so its plank resolves. A presenter slide is the case this fixes: the collection holds the presentation, not the slide, so the walk up the collection tree found nothing, the slide's URL (`object/<id>`) resolved to no path, and the plank it opened from the nav tree sat on "Loading…" for good.
