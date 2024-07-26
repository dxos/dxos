# Observability

This package provides isomorphic observability capabilities for the DXOS platform.

* Error log capture for monitoring and alerting.
* Time-series data for monitoring, diagnostics, and alerting.
* Telemetry logging for product usage statistics.

The observability package provides the following facilities to support these capabilities:
* Secrets loading for API keys for SaaS services
* Common tag handling
* Common group, opt-in handling

This is currently implemented using the following providers:

* Error log capture - Sentry and OpenTelemetry
* Time-series data = OpenTelemetry
* Telemetry logging - Segment

# Usage and Configuration
Entry points are provided in [helpers/](src/helpers/), which contain functionality to persist the configuration.

`Mode` can be `disabled`, `basic`, and `full`. `basic` and `full` currently have the same behavior, but will control the exposure of public identity keys in the future. See https://github.com/orgs/dxos/discussions/5438

`Group` is intended to be used to distinguish different deployments and usages of the same application, such as internal and external deployments and testing of the observability infrastructure.

`Namespace` is used by the provider backends to distinguish different applications and services.

# TODO
* Stabilize API and further decouple it from the underlying providers
* Factor out metrics capabilities into ObservabilityExtension classes
