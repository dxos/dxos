---
position: 1.1
label: Installation
---
# ECHO Installation
Install using package manager of choice `npm`,`yarn`,`pnpm`:
```bash
npm install --save @dxos/echo
```
Alternatively, include from CDN:
```html{3}
<html>
  <head>
    <script src="https://jsdelivr..."></script>
  </head>
  <body>
  </body>
</html>

```
Create a new client object like this:
@[code](snippets/create-client.ts)
