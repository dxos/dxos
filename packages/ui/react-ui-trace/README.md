# @dxos/react-ui-trace

Runtime observability components: the process tree, the trace as a commit-graph `Timeline`, sessions and their tasks as a `Gantt`, and the `TracePanel` that composes them. The data layer (`buildExecutionGraph`, `buildSessionTimeline`) is pure and reads `@dxos/compute` `Trace.Message`s and `Process.Info`s; hosts resolve their process monitor and trace feed and pass them in.
