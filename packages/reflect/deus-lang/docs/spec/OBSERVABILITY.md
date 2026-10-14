# Observability output format

DEUS code logs, traces and counts through three abilities, `Log`, `Trace` and `Metrics`, and a handler
decides where the events go ([D31](../DECISIONS.md)). `deus run` handles them in one of two ways: NDJSON
lines on stderr by default, or OpenTelemetry JSON lines in files under `$DEUS_OTLP`
([D35](../DECISIONS.md)). Agents and people read the NDJSON; an OpenTelemetry collector's `otlpjsonfile`
receiver, or any tool that reads OTLP/JSON, reads the files. This spec gives the event model, both line
formats, and the text of defect stack traces. The abilities and both writers are in
[`deus/observe.deus`](../../deus/observe.deus); `deus run` is in [`deus/cli.deus`](../../deus/cli.deus).

## Events

The abilities have no declared IRI, so they are `urn:deus:Log`, `urn:deus:Trace` and `urn:deus:Metrics`.

| Operation                       | Type                                     | Event                           |
| ------------------------------- | ---------------------------------------- | ------------------------------- |
| `Log.emit level message fields` | `Text → Text → List (Text, Text) → Unit` | one `log` event                 |
| `Trace.start name attrs`        | `Text → List (Text, Text) → Int`         | none yet; returns a new span id |
| `Trace.finish id`               | `Int → Unit`                             | one `span` event for span `id`  |
| `Metrics.counter name value`    | `Text → Int → Unit`                      | one `counter` event             |
| `Metrics.gauge name value`      | `Text → Int → Unit`                      | one `gauge` event               |

`Log.debug`, `Log.info`, `Log.warn` and `Log.error` call `emit` with that level. `Trace.span name attrs body`
calls `start`, runs `body`, then `finish`. Field and attribute values are always text; metric values are
32-bit integers.

`Observe.handleWith` turns operations into events the same way for every sink:

- Span ids count from 1 within one handled run. Id 0 means "no span".
- A span's parent is the innermost span open when it started, or 0.
- A log event carries the innermost open span (`within`), or 0.
- A span event is emitted when the span finishes, so a child's event comes before its parent's.
  `Trace.finish` of an id that is not open does nothing. A span that never finishes, for example because
  a defect ended the run, is never emitted.
- Every event is stamped by the handler's clock when it happens. For `deus run` the clock is `IO.wallClock`:
  nanoseconds since the Unix epoch, as decimal text. Both kernels measure in microseconds, so the last
  three digits are `000`.

Events reach the sink as they happen, so everything before a defect is written. `Observe.collect`, used by
`deus test`, keeps the events in memory instead and stamps them with a logical clock (`"1"`, `"2"`, …); the
test runner discards them, and a test can call `Observe.collect` itself to assert on them.

## NDJSON

Without `$DEUS_OTLP`, `deus run` writes each event to stderr as one JSON object and `\n`. The program's own
stderr output is interleaved on the same stream; a reader should skip lines that do not parse as JSON
objects with a `type` field. JSON is rendered as in [CLI-JSON.md](./CLI-JSON.md#json-rendering).

```text
log     = {"type":"log", "time":T, "level":S, "message":S, "span":N, "fields":{S:S,…}}
span    = {"type":"span", "id":N, "parent":N, "name":S, "start":T, "end":T, "attrs":{S:S,…}}
counter = {"type":"counter", "time":T, "name":S, "value":N}
gauge   = {"type":"gauge", "time":T, "name":S, "value":N}
```

`T` is the clock text described above, `N` a JSON integer. `fields` and `attrs` keep the program's order;
a key given twice appears twice. A real run:

```json
{"type":"log","time":"1792000952803557000","level":"info","message":"reading","span":1,"fields":{"bytes":"12"}}
{"type":"counter","time":"1792000952807255000","name":"reads","value":1}
{"type":"gauge","time":"1792000952807626000","name":"queue","value":3}
{"type":"span","id":1,"parent":0,"name":"load","start":"1792000952802708000","end":"1792000952808463000","attrs":{"file":"a.txt"}}
{"type":"log","time":"1792000953090391000","level":"warn","message":"done","span":0,"fields":{}}
```

## OTLP JSON lines

With `DEUS_OTLP=<dir>`, `deus run` appends to three files in `<dir>`, creating them as needed. Each line
is one complete OTLP/JSON export request holding exactly one span, log record or metric:

| File            | Line                             |
| --------------- | -------------------------------- |
| `traces.jsonl`  | an `ExportTraceServiceRequest`   |
| `logs.jsonl`    | an `ExportLogsServiceRequest`    |
| `metrics.jsonl` | an `ExportMetricsServiceRequest` |

Files are appended to, never truncated, so several runs accumulate in one directory.

### Identifiers

Every run gets one trace:

```text
traceId(run)   = first 32 hex chars of SHA-256(service ":" wallClock-at-start)
spanId(id)     = first 16 hex chars of SHA-256(traceId ":" decimal(id))
```

`service` is the name argument of `deus run` exactly as typed (`Obs.main`, or `#4e402ae378`). SHA-256 is
over the UTF-8 text and printed in lowercase hex.

### Common envelope

Every line has one resource and one scope:

```text
resource = {"attributes":[{"key":"service.name","value":{"stringValue":service}}]}
scope    = {"name":"deus"}
attrs    = [{"key":K,"value":{"stringValue":V}},…]       from the event's fields, in order
```

### Spans

```text
{"resourceSpans":[{"resource":R,"scopeSpans":[{"scope":S,"spans":[
  {"traceId":…, "spanId":spanId(id), "name":…, "kind":1,
   "startTimeUnixNano":T, "endTimeUnixNano":T, "attributes":attrs,
   "parentSpanId":spanId(parent)}            only when parent ≠ 0
]}]}]}
```

`kind` 1 is `SPAN_KIND_INTERNAL`. Times are strings, as OTLP/JSON encodes 64-bit integers.

### Logs

```text
{"resourceLogs":[{"resource":R,"scopeLogs":[{"scope":S,"logRecords":[
  {"timeUnixNano":T, "severityNumber":N, "severityText":level,
   "body":{"stringValue":message}, "attributes":attrs,
   "traceId":…, "spanId":spanId(span)}       only when the log is inside a span
]}]}]}
```

| `level`       | `severityNumber` |
| ------------- | ---------------- |
| `debug`       | 5 (DEBUG)        |
| `info`        | 9 (INFO)         |
| `warn`        | 13 (WARN)        |
| `error`       | 17 (ERROR)       |
| anything else | 9                |

`severityText` is the level as given.

### Metrics

```text
{"resourceMetrics":[{"resource":R,"scopeMetrics":[{"scope":S,"metrics":[{"name":…, DATA}]}]}]}

DATA (counter) = "sum":{"dataPoints":[P],"aggregationTemporality":1,"isMonotonic":true}
DATA (gauge)   = "gauge":{"dataPoints":[P]}
P              = {"timeUnixNano":T,"asInt":decimal-string}
```

A counter is a delta sum (`aggregationTemporality` 1): each line is one increment, not a running total.
Points carry no attributes and no start time.

A real `traces.jsonl` line:

```json
{
  "resourceSpans": [
    {
      "resource": { "attributes": [{ "key": "service.name", "value": { "stringValue": "Obs.main" } }] },
      "scopeSpans": [
        {
          "scope": { "name": "deus" },
          "spans": [
            {
              "traceId": "5123180da287282015efe8d9ebea6d63",
              "spanId": "fdc74314299f0a49",
              "name": "load",
              "kind": 1,
              "startTimeUnixNano": "1792000953080578000",
              "endTimeUnixNano": "1792000953089397000",
              "attributes": [{ "key": "file", "value": { "stringValue": "a.txt" } }]
            }
          ]
        }
      ]
    }
  ]
}
```

## Defects

When a defect reaches the top of a program, the kernel records the definitions on the stack at that point:
innermost first, at most 32, with consecutive repeats collapsed and the frames below the handling
definition left out. A call in tail position leaves no frame, so it leaves no line. The stack is a list of
definition hashes; who prints it decides how.

`deus run` names the hashes with the codebase and drops the ones it cannot name (the toolchain's own
handlers), then prints to stderr and exits 70:

```text
defect: division by zero
    at Obs.inner
    at Obs.middle
    at Obs.boom
    at Observe.handleWith
```

The last line is the telemetry handler `deus run` installs; it is named because this codebase holds
`deus/observe.deus`.

```text
defect-report = "defect: " message { "\n    at " name } "\n"
```

`deus test` and `deus check` use the same lines, without the final newline, as a failed test's `reason`
([CLI-JSON.md](./CLI-JSON.md)). A kernel running an image directly (`deus-kernel`, an executable from
`deus build`) has no codebase and prints hashes:

```text
defect: division by zero
  at #<hash>
```

with two spaces and `#` before each hash, and exits 70. The embeddable kernel returns the hashes as the
`trace` array of a `defect` result ([EMBEDDING.md](./EMBEDDING.md#results)).

Note: [D31](../DECISIONS.md) says spans identify code by hash. Spans carry only the name and attributes
the program gives; definition hashes appear only in defect traces.
