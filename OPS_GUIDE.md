# DXOS Repository Guide

Documentation about the runtime components of DXOS.

## Code

There are two repositories that deploy in combination to produce the environments below.

| Repository | Description                                                                                  |
| :--------- | :------------------------------------------------------------------------------------------- |
| kube       |                                                                                              |
| dxos       | Deploys packages to npm and applications to kubes. Deploys using GitHub Actions and CircleCi |

## Environments

See the full [branch flow](./REPOSITORY_GUIDE.md#branch-diagram) in the [Repository Guide](./REPOSITORY_GUIDE.md).

| Environment | Description                                       |
| :---------- | :------------------------------------------------ |
| prod        | whatever is on `production` branch in `dxos` repo |
| staging     | whatever is on `staging` branch in `dxos` repo    |
| dev         | whatever is on `main` branch in `dxos` repo       |

## Assets

| Asset          | Description                                                                           |
| :------------- | :------------------------------------------------------------------------------------ |
| PagerDuty      | Reliably notifies DXOS developers when monitors fail                                  |
| DataDog        | Collects detailed telemetry from servers, runs monitors, and notifies PagerDuty       |
| Sentry         | Collects error reports from servers and clients, replays, and traces from all clients |
| Segment        | Collects long term product usage telemetry into PostgreSQL                            |
| Superset       | Visualizes telemetry stored in PostgreSQL, running on DigitalOcean                    |
| Elastic Search | Contains access and runtime logs from servers                                         |
| Kibana         | Visualizes logs stored in Elastic Search, running on DigitalOcean                     |
| DigitalOcean   | Runs machines for kubes and PostgreSQL                                                |

No system collects all client side logs entirely. Only the errors, traces, and replays subset is covered by Sentry for all clients and may be impaired by client side blockers like browsers, extensions, proxies, etc.
