---
position: 2
label: dx.yml file
---

# `dx.yml` file
This file defines how your application is to be configured and deployed.

Sample configuration:
```yaml
version: 1

package:
  license: MIT
  repos:
    - type: git
      url: https://github.com/dxos/cli

  modules:
    - type: dxos:type/app
      name: app-for-test
      displayName: Tasks List
      description: Mock application
      tags:
        - tasks
        - todo
        - productivity
      build:
        command: npm run build
        outdir: 'out'
        version: 1.2.3
        tag: latest
```