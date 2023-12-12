`dx kube`
=========

KUBE is a set of runtime services for static web apps and peer-to-peer applications.

* [`dx kube auth`](#dx-kube-auth)
* [`dx kube deploy`](#dx-kube-deploy)

## `dx kube auth`

Authenticate with KUBE.

```
USAGE
  $ dx kube auth [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent] [--timeout
    <value>] [--no-wait]

FLAGS
  -v, --verbose      Verbose output
  --config=path      [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dry-run          Dry run.
  --no-agent         Run command without using or starting agent.
  --no-wait          Do not wait for space to be ready.
  --profile=<value>  [default: default] User profile.
  --timeout=<value>  [default: 60000] Timeout (ms).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Authenticate with KUBE.
```

## `dx kube deploy`

Deploy KUBE.

```
USAGE
  $ dx kube deploy --hostname <value> [--json] [--dry-run] [-v] [--config <value> --profile <value>] [--no-agent]
    [--timeout <value>] [--no-wait] [--provider <value>] [--accessToken <value>] [--dev]

FLAGS
  -v, --verbose          Verbose output
  --accessToken=<value>  Access token for seeding admin identity
  --config=path          [default: /Users/nf/.config/dx/profile/default.yml] Config file.
  --dev                  Deploy latest version from dev channel
  --dry-run              Dry run.
  --hostname=<value>     (required) Hostname
  --json                 Output as JSON.
  --no-agent             Run command without using or starting agent.
  --no-wait              Do not wait for space to be ready.
  --profile=<value>      [default: default] User profile.
  --provider=<value>     [default: digitalocean] Cloud Provider
  --timeout=<value>      [default: 60000] Timeout (ms).

DESCRIPTION
  Deploy KUBE.
```
