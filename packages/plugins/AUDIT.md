# Plugin Capability Audit

Cross-plugin capability contracts: where one plugin defines a capability interface and another implements it.

| Plugin | Namespace | Capability |
| --- | --- | --- |
| `plugin-calls` | `CallsCapabilities` | `EventHandler` |
| `plugin-game` | `GameCapabilities` | `VariantProvider` |
| `plugin-map` | `MapCapabilities` | `MarkerProvider` |
| `plugin-markdown` | `MarkdownCapabilities` | `ExtensionProvider` |
| `plugin-transcription` | `TranscriptionCapabilities` | `TranscriberProvider` |
| `plugin-transcription` | `TranscriptionCapabilities` | `TranscriptionManagerProvider` |
| `plugin-trip` | `TripCapabilities` | `BookingService` |
| `plugin-trip` | `TripCapabilities` | `RoutingService` |
