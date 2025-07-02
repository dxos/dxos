# GH Actions CI

## Actions

- [ ] Migration from CircleCI (via Windsurf)
- [ ] Implement NX cache
- [ ] Eval performance and cost relative to CircleCI and NX
- [ ] Tooling recommendations (e.g., GH Actions, NX, plugins)
- [ ] Windsurf/Claude PR code reviews

## Tools

- Use `act` with local Docker Desktop to run GH Actions locally.

```bash
brew install docker --cask
brew install act

act -j check -e .github/workflows/testing/test-push-event.json --container-architecture linux/arm64 -v
```
