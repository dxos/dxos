# DXOS protocols 

* ECHO
* HALO
* MESH
* SDK

## Using Rush stack

Installing Rush:
```
npm install -g @microsoft/rush
```

1. Install dependencies

```
rush update
```

2. Build package

```
rush build
```

### Adding new dependencies


```
cd package/directory

rush add [--dev] -p <package name>
```

### Running scripts in individual packages

```
cd package/directory

rushx <script name>
```


### Adding a new package to the monorepo

When merging monorepos it's best practice to add packages one by one, starting from the ones lowest in the dependency chain. And ensuring that the project builds after each package added.

1. Copy over package contents.
2. Add the package to the list in `<root>/rush.json`.
3. Run `rush update` and fix any broken dependencies.
4. Put the entire package lifecycle in the `build` script. it might look like `"build": "tsc && pnpm run lint && pnpm run test`. Look for examples in other packages.
5. Make sure that package builds.
6. (optional) Refactor to use Heft and rig packages.
