# Troubleshooting

This section includes tips for dealing with common problems.

Please consider submitting a PR if you encounter problems you've successfully resolved.

### Conflicts in `package-lock.yaml`

While rebasing, you can skip dealing with it during the rebase, just be sure to finalize with a `pnpm install` to regenerate the file at the end.

```
git checkout --ours pnpm-lock.yaml && git add pnpm-lock.yaml && git rebase --continue
```

finally

```
pnpm i
```

to regenerate the `pnpm-lock.yaml` on the new `HEAD`.

### Publish succeeds in CI but app does not show up in dev

If the `publish` job succeeds in CI but the app does not appear to be updated there are a couple reasons why that might happen:

1. It's possible that bundling of the app failed so check the logs of the job.
Currently the publish script ignores failures so that all apps get published even if one fails.
2. Make sure that the outdir of the app is correct.
If `package.modules.build.outdir` isn't specified the default of `out/<module.name>` will be used.
If the app is not built to that directory then when the dx cli publishes it won't upload any of the assets.
