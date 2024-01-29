#

This package provides isomorphic observability capabilities for the DXOS platform.

* Error log capture for monitoring and alerting.
* Time-series data for monitoring, diagnostics, and alerting.
* Telemetry logging for product usage statistics.

The observability package provides the following facilities to support these capabilities:
* Secrets loading
* Common tag handling
* Common group, opt-in handling

This is currently implemented using the following providers:

* Error log capture - Sentry
* Time-series data = Datadog
* Telemetry logging - Segment

# Datadog

## Usage

# TODO
* Stabilize API and further decouple it from the underlying providers
* Factor out metrics capabilities into ObservabilityExtension classes
