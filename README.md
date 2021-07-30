[![publish](https://github.com/dxos/protocols/actions/workflows/publish.yaml/badge.svg)](https://github.com/dxos/protocols/actions/workflows/publish.yaml)

![js-dxos](./docs/images/github-repo-banner.png)

## DXOS Protocols 

**dxos-js** is a  monorepo containing the TypeScript implementation of the DXOS protocols, SDK, and toolchain. 
If you are unfamiliar with DXOS, see our [website](https://dxos.org) for more information.

## Quick start

[Getting started](./docs/content/getting-started.md).

## Installation and usage

## Troubleshooting

## Pack Tasks App
<!-- TODO: Let's try to make an script for this (zarco)  -->
<!-- 
The script should read the version in the package json to select the tgz file, unpack it and
also commit the new release version
-->
To spin up this repo documentation on your local environment please follow this steps:

```bash
$ cd /packages/sdk/tutorials/apps/tasks-app
$ rushx pack:app
$ git clone git@github.com:dxos/dxos-tutorial-tasks-app.git
$ git checkout . # Undo package.json changes that are made for packing purposes
$ tar -xvzf dxos-tutorials-tasks-app-0.1.0.tgz
$ cp -R package/* dxos-tutorial-tasks-app/
$ rm -rf package/
$ cd dxos-tutorial-tasks-app/
$ yarn # Install packages for the packed version
$ yarn build # Build it
$ cd dist # check if it works running an http-server in there
$ cd .. # back to dxos-tutorial-tasks-app/
$ git add .
$ git commit -m "release: v0.1.0"
$ git push origin master
$ cd .. # back to tasks-app/
$ rm -rf dxos-tutorial-tasks-app ## OPTIONAL remove temporal public repo
```

## Contributing


## License
