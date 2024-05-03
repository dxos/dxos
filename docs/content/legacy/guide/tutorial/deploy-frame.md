---
position: 7
label: Deploy Frame
---

# Deploy Frame

Once you've [created your frame](./create-frame), we can move on to the next step: deploy it to the registry so that it can be used by you and others.

## Claim Domain

Circling back to your domain, if you haven't claimed it yet, now you can do so. If you missed that step you'll need to go through [Address and Account Setup](./address-account-setup) before continuing.

```bash
dx ns auction close example
dx ns auction claim example
```

## Update Config

Before deploying the frame you'll need to update the config file `dx.yml`. This file defines the static configuration for a DXNS record.

There's a few fields in particular which need to be updated from the template:

- `name`: the DXN of your frame, starting with your domain followed by the name of your frame. By convention frame names start with `frame.`.
- `description`: what your frame is.
- `author`: your name or organization.
- `repository`: where the source of your frame is published.
- `contentType`: a list of the types of items the frame is able to load.

```diff
 module:
   type: dxos:type.app
-  name: example:frame.template
-  description: Frame Starter Template
-  author: DXOS.org
+  name: example:frame.tasks
+  description: Tasks List
+  author: Your Name
   license: AGPL-3.0
-  repository: 'https://github.com/dxos/braneframe/packages/frames/template-frame'
+  repository: 'https://github.com/my-account/tasks-frame'
+  record:
+    app:
+      contentType:
+        - example:type.tasks.list
```

## Deploy

Once you have updated the `dx.yml` file, you can deploy your frame to the registry. This will run the build command, publish the assets from the `out` directory to IPFS and create a new record in the registry tagged as `latest`.

```bash
dx ns deploy --tag latest
```

> NOTE: The `latest` tag is a special tag which is the default loaded when no other tags or versions are specified.

## Ready For Action

Your frame is now deployed, let's try it out!

TODO FrameDisplay

## What's Next?

- Try extending your tasks list frame to support editing tasks.
- Learn about more advanced ECHO functionality for building out more complex applications.
  - TODO link to ECHO guide
- Learn about extending your frame's functionality with custom icons, settings and actions.
  - TODO link to frame guide
- Explore the KUBE Console, find your frame and explore other frames.
   - TODO link Console guide.
- Open the Braneframe app from Console and try to load your frame there.
   - TODO link to Braneframe.
- Build your own frame host app that can use your frame.
   - TODO link to frame host guide.
