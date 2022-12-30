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

To run decoupled tests (such as a host and a guest agents):

Host
```bash
pnpm run agent start --verbose --config ./config/config.yml --spec ./config/spec-test-host.yml
```
Guest
```bash
pnpm run agent start --verbose --config ./config/config.yml --spec ./config/spec-test-guest.yml
```