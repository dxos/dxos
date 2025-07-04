# GH Actions CI

## Tools

- Use `act` with local Docker Desktop to run GH Actions locally.

```bash
brew install docker-desktop
brew install act
```

To run check or test jobs:

```bash
act -j check
act -j test
```

To run e2e job:

```bash
./.github/workflows/scripts/test-act.sh check.yml e2e
```

## Resources

- https://nx.dev/ci/intro/tutorials/github-actions
- https://nektosact.com/introduction.html
