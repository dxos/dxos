## Pack Tasks App
<!-- TODO: Let's try to make an script for this (zarco)  -->
<!-- 
The script should read the version in the package json to select the tgz file, unpack it and
also commit the new release version
-->
The official Tasks App lives in it's own repo but we keep it here so we can test it alongside with the rest of the packages and using Rush and PNPM to switch versions. 

```bash
$ cd apps/tasks-app/
$ rushx pack:app
$ git clone git@github.com:dxos/tutorial-tasks-app.git
$ git checkout . # Undo package.json changes that are made for packing purposes
$ tar -xvzf dxos-tutorials-tasks-app-0.1.0.tgz
$ cp -R package/* tutorial-tasks-app/
$ rm -rf package/
$ cd tutorial-tasks-app/
$ yarn # Install packages for the packed version
$ yarn build # Build it
$ cd dist # check if it works running an http-server in there
$ cd .. # back to tutorial-tasks-app/
$ git add .
$ git commit -m "release: v0.1.0"
$ git push origin master
$ cd .. # back to tasks-app/
$ rm -rf tutorial-tasks-app ## OPTIONAL remove temporal public repo
```