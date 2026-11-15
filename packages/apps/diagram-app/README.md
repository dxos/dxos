# @dxos/diagram-app

A diagramming app that is one full-screen canvas. It makes an anonymous identity on first run, keeps diagrams in
spaces, and shares a space with a link. Spaces, diagrams and links are Composer's, so a link from either app opens
in the other. The spec is `spec/APP.mdl`.

## Run

```bash
moon run diagram-app:serve
```

## EDGE

Identities here have no Hub account, so EDGE gives them signaling only: members sync peer to peer while another
member is online. A link from a Composer user whose space has an EDGE agent is redeemed by EDGE at any time. See
the spec's "Running against EDGE without an account" section.
