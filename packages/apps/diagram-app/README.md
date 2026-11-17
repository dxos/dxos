# @dxos/diagram-app

A diagramming app that is one full-screen canvas. It makes an anonymous identity on first run, keeps diagrams in
spaces, and shares a space with a link. Spaces, diagrams and links are Composer's, so a link from either app opens
in the other. The spec is `spec/APP.mdl`.

## Source

- `src/main.tsx` and `src/plugins.ts` wire the app: the client and its workers, the boot shell, and the plugin set.
- `src/boot-shell/` is the shell painted before the plugins load: the pill and the canvas frame, and, for an
  invitation link, a still copy of the join dialog over them.
- `src/layout-plugin/` is `DiagramAppPlugin`, the layout plugin in place of Composer's deck. It holds the open space
  and diagram, answers the layout operations other plugins call, and renders everything on screen.
- `src/shared/` is what the boot shell and the layout plugin both use: the pill, the route, local state, default
  names, and the shell state through which the plugin dismisses the shell's parts.

## Run

```bash
moon run diagram-app:serve
```

## EDGE

Identities here have no Hub account, so EDGE gives them signaling only: members sync peer to peer while another
member is online. A link from a Composer user whose space has an EDGE agent is redeemed by EDGE at any time. See
the spec's "Running against EDGE without an account" section.
