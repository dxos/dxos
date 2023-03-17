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
