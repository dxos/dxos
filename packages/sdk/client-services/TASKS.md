# client-services — Tasks

The worker-runtime refactor this file used to track (kill shared-worker, `WorkerRuntime`/
`WorkerSession` as Effect services, remove `ServiceRegistry`, fold `ServiceContext` into
`ClientServicesHost`) is complete, and `ClientServicesHost` itself no longer exists: the runtime is
composed as `ClientServicesLayer` and its lifecycle is driven by events on a `Hook.Controller` rather
than by an orchestrator class.

Current work-stream and open items:
[`.agents/projects/client-services-dissolve-host/TASKS.md`](../../../.agents/projects/client-services-dissolve-host/TASKS.md)
(design: [`DESIGN.md`](../../../.agents/projects/client-services-dissolve-host/DESIGN.md)).

Architecture reference: `src/packlets/services/events.ts` documents the lifecycle event chain;
`src/packlets/services/client-services-stack.ts` composes the stack.
