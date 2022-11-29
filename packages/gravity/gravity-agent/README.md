# Gravity Agent

To run the agent locally for testing:

```bash
# while sitting in this folder /packages/gravity/gravity-agent
LOG_CONFIG=./log-config.yml pnpm run agent start --verbose
```

To run the tests:

```bash
# if you have pc alias
LOG_CONFIG=packages/gravity/gravity-agent/log-config.yml pc test
# if not
LOG_CONFIG=packages/gravity/gravity-agent/log-config.yml pnpm -w nx run test gravity-test
```
