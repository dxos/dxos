# plugin-studio — Tasks

## Done

- [x] Move generation properties (`config`, `jobId`, `meta`, `name`) onto the `Variant`
      schema; the Artifact keeps only prompt/generator/variants. Compose config is an
      in-memory draft Variant (dedicated "Draft" tab); a produced Variant is frozen. Async
      jobs persist their `jobId` on a pending Variant so a poll resumes across remount.
