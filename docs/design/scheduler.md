# The Scheduler

## Control flow

All of the following runs within the context of a Space (and associated Durable Objects).

- Users create `Trigger` objects (e.g., Cron, Subscription, Webhook, Direct).
- A `Trigger` specifies and action (e.g., Operation, Instructions).
- The `Scheduler` subscribes to `Trigger` objects and sets up the trigger processes.
- When a trigger fires it writes a `Job` onto the Job queue.
  - NOTE: Triggers do not invoke the action directly; the job queue enables us to prioritize, retry, and audit Jobs.
- The `Process Manager` subscribes to the Job queue and initiates a `Process`
  - A `Process` may invoke an `Operation` directly then exit.
  - An `Agent Process` starts an `Agent` with a `Chat` session and `Feed`.
- An `Agent Process` runs until it decides to terminate, or is terminated by the `Process Manager`.
- The `Agent` is controlled by:
  - The `Skill` modules it has access to.
  - Its `Instructions`.
- It uses skills to read, update, and create `Artifact` objects.
  - These artifacts may contain `Task` objects that INDIRECTLY control its behavior (depending on its instructions).
  - NOTE: Tasks are not "special"; it could just as easily be controlled by a poem, diagram or weather feed.
    However, The Task Planning skill enables users to indirectly control and monitor the agent.

## Schematic

![Schematic](./diagrams/scheduler.drawio.svg)

## Control Plans and Observation

- Triggers (user control mechanism)
  - Job Queue (policy based on resources)
    - Process Tree (runtime state)
      - Agent Chat Feeds (durable state)
        - Artifacts (output)
