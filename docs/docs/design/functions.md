# Functions

## Background

- Functions are short-lived scripts that run within a privileged execution context on any peer (client or agent).
- Functions have access to the peer's Client via a context object (incl. HALO credentials, config, keys, etc.)
- Functions are triggered by events (e.g., HTTP request, RCP call, timer, ECHO subscription update) and implement a common handle API similar to AWS Lambda.
- Functions may be developed in different languages and compiled into WebAssembly.






Issues:
- Life cycle
- Registration
- Credentials
- Difference from Scripts
- Execution environment, isolation
- Scale


## Use cases

- Chess
- OpenAI
- Protonmail

