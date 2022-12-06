# Gravity Agent

To run the agent locally for testing:

```bash
cd packages/gravity/gravity-agent
LOG_CONFIG=./log-config.yml pnpm run agent start --verbose
```

To run the tests:

```bash
LOG_CONFIG=packages/gravity/gravity-agent/log-config.yml pnpm -w nx run test gravity-test
```
