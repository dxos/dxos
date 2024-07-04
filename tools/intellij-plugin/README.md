# IntelliJ Plugin

IntelliJ IDE integrations for dxos project.

## Installation

From `tools/intellij-plugin` directory run:
```bash
./gradlew build
```
A packaged plugin will appear under `build/distributions`.

Run "Install Plugin from disk": `cmd+shift+A` and search the action, or go to Plugins settings and click on gear icon.

## Features

* `nx test` executor for all the context where `Mocha` plugin suggests a run configuration.
* `Jump to _open / _close` of `Resource` subclasses line marker.
* `Jump to ServiceImpl` for services registered in `service-host.ts` file.