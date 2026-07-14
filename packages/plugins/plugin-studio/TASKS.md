# plugin-studio — Tasks

## Backlog

- [ ] Move generation parameters onto the `Variant` schema (not `Artifact`).
      Today `Artifact.config` holds the request knobs and each `Variant.generation`
      copies them at generate time; the request config should live on the Variant so
      provenance is owned by the produced output, and the Artifact keeps only the
      current/next compose state. Revisit `Artifact.config` vs `Variant.generation.parameters`.
