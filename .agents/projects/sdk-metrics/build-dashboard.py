import json

VARS = "deployment.environment in $deployment.environment AND ctx.tag in $ctx.tag"

def agg(metric, time_agg, space_agg, reduce_to):
    return [{"metricName": metric, "reduceTo": reduce_to, "spaceAggregation": space_agg,
             "temporality": "", "timeAggregation": time_agg}]

def bq(name, metric, time_agg, space_agg, reduce_to, legend, group=None, extra_filter=None,
       disabled=False, limit=None):
    expr = VARS + (f" AND {extra_filter}" if extra_filter else "")
    spec = {"signal": "metrics", "aggregations": agg(metric, time_agg, space_agg, reduce_to),
            "disabled": disabled, "filter": {"expression": expr}, "functions": [],
            "groupBy": [{"name": g, "fieldContext": "attribute", "fieldDataType": "string",
                         "signal": "metrics"} for g in (group or [])],
            "having": {"expression": ""}, "legend": legend, "name": name, "order": [], "source": ""}
    if limit:
        spec["limit"] = limit
    return spec

def ts_query(name, **kw):
    return {"kind": "time_series", "spec": {"name": name,
            "plugin": {"kind": "signoz/BuilderQuery", "spec": bq(name, **kw)}}}

def scalar_query(name, **kw):
    return {"kind": "scalar", "spec": {"name": name,
            "plugin": {"kind": "signoz/BuilderQuery", "spec": bq(name, **kw)}}}

def composite(queries, formula=None, kind="scalar"):
    qs = [{"type": "builder_query", "spec": {**q, "stepInterval": 0}} for q in queries]
    if formula:
        qs.append({"type": "builder_formula", "spec": formula})
    return {"kind": kind, "spec": {"plugin": {"kind": "signoz/CompositeQuery", "spec": {"queries": qs}}}}

def series(*specs):
    """One query entry for a panel: a bare BuilderQuery for a single series, a CompositeQuery
    for several — SigNoz rejects a panel that lists more than one query entry."""
    if len(specs) == 1:
        return [{"kind": "time_series", "spec": {"name": specs[0]["name"],
                 "plugin": {"kind": "signoz/BuilderQuery", "spec": specs[0]}}}]
    return [composite(list(specs), kind="time_series")]

def number(name, desc, queries, unit="none", precision="1", thresholds=None):
    return {"kind": "Panel", "spec": {"display": {"name": name, "description": desc}, "links": [],
        "plugin": {"kind": "signoz/NumberPanel", "spec": {
            "formatting": {"decimalPrecision": precision, "unit": unit},
            "thresholds": thresholds, "visualization": {"timePreference": "global_time"}}},
        "queries": queries}}

def timeseries(name, desc, queries, unit="none", precision="1", thresholds=None):
    return {"kind": "Panel", "spec": {"display": {"name": name, "description": desc}, "links": [],
        "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {
            "axes": {"isLogScale": False, "softMax": 0, "softMin": 0},
            "chartAppearance": {"fillMode": "none", "lineInterpolation": "spline",
                "lineStyle": "solid", "showPoints": False,
                "spanGaps": {"fillLessThan": "", "fillOnlyBelow": False}},
            "formatting": {"decimalPrecision": precision, "unit": unit},
            "legend": {"customColors": None, "mode": "list", "position": "bottom"},
            "thresholds": thresholds,
            "visualization": {"fillSpans": False, "timePreference": "global_time"}}},
        "queries": queries}}

def table(name, desc, queries, column_units):
    return {"kind": "Panel", "spec": {"display": {"name": name, "description": desc}, "links": [],
        "plugin": {"kind": "signoz/TablePanel", "spec": {
            "formatting": {"columnUnits": column_units, "decimalPrecision": "2"},
            "thresholds": None, "visualization": {"timePreference": "global_time"}}},
        "queries": queries}}

def dyn_var(name, desc):
    return {"kind": "ListVariable", "spec": {"name": name,
        "display": {"name": name, "description": desc},
        "allowAllValue": True, "allowMultiple": True, "capturingRegexp": "", "customAllValue": "",
        "sort": "alphabetical-asc",
        "plugin": {"kind": "signoz/DynamicVariable", "spec": {"name": name, "signal": "metrics"}}}}

SPACES = "dxos.client.spaces.count"
READY = "dxos.client.spaces.ready.count"
DOCS = "dxos.echo.documents.count"
UNSYNCED = "dxos.echo.documents.unsynced.count"
HEAP_USED = "dxos.client.runtime.heapUsed"
HEAP_LIMIT = "dxos.client.runtime.heapSizeLimit"
# A histogram lands as several series in SigNoz: one .bucket per boundary plus .min/.max/.sum/.count.
# min/max read straight off their series; avg is .sum / .count as a formula.
EPISODE = "dxos.echo.sync.episode.duration"
STALLED = "dxos.echo.sync.stalled.duration"
LAG = "dxos.client.runtime.eventLoop.lag"
QUEUE_WAIT = "dxos.rpc.queueWait.duration"
RPC_SERVICE = "dxos.rpc.service.duration"
PENDING = "dxos.echo.sync.pending.count"
WS_RECONNECT = "dxos.edge.ws.reconnect.count"
WS_SESSION = "dxos.edge.ws.session.reconnects"
WS_CONNECTED = "dxos.edge.ws.connected"
WORKER_REALMS = "dxos.process.type in ('shared-worker', 'dedicated-worker', 'service-worker')"

panels = {
  "stat-spaces": number("Spaces per client (avg)", "", [
      scalar_query("A", metric=SPACES, time_agg="avg", space_agg="avg", reduce_to="last", legend="")]),
  "stat-docs": number("Documents loaded per client (avg)", "location=local — the resident document count.", [
      scalar_query("A", metric=DOCS, time_agg="avg", space_agg="avg", reduce_to="last", legend="",
                   extra_filter="location = 'local'")], precision="0"),
  "stat-unsynced": number("Unsynced documents (fleet total)", "Summed across clients — total outstanding backlog.", [
      scalar_query("A", metric=UNSYNCED, time_agg="latest", space_agg="sum", reduce_to="last", legend="")], precision="0"),
  "stat-heap-pressure": number("Heap pressure (worst client %)",
      "heapUsed / heapSizeLimit. Above ~90% the browser is close to an OOM kill.",
      [composite(
          [bq("A", HEAP_USED, "max", "max", "last", "used", disabled=True),
           bq("B", HEAP_LIMIT, "max", "max", "last", "limit", disabled=True)],
          {"disabled": False, "expression": "A / B * 100", "functions": None,
           "having": {"expression": ""}, "legend": "heap pressure %", "name": "F1", "order": None})],
      unit="percent",
      thresholds=[{"color": "Red", "format": "background", "operator": "above", "unit": "percent", "value": 90}]),
  "spaces-dist": timeseries("Spaces per client — avg / max",
      "Aggregated across clients within each bucket. No p90/p99: SigNoz only supports percentile space aggregation on histograms, not gauges.",
      series(bq("A", SPACES, "avg", "avg", "avg", "avg"),
             bq("B", SPACES, "min", "min", "min", "min"),
             bq("C", SPACES, "max", "max", "max", "max"))),
  "spaces-ready": timeseries("Known vs ready spaces (avg per client)",
      "The gap is spaces the client knows about but has not opened.",
      series(bq("A", SPACES, "avg", "avg", "avg", "known"),
             bq("B", READY, "avg", "avg", "avg", "ready"))),
  "docs-location": timeseries("Documents per client by location",
      "local vs remote; they converge when the client is fully synced.",
      series(bq("A", DOCS, "avg", "avg", "avg", "{{location}}", group=["location"])), precision="0"),
  "unsynced-backlog": timeseries("Unsynced backlog per client — avg / max",
      "p90/p99 would need this exported as a histogram; a gauge only supports avg/min/max/sum across clients. A max that stays flat while avg sits near 0 is still a single stuck client.",
      series(bq("A", UNSYNCED, "avg", "avg", "avg", "avg client"),
             bq("B", UNSYNCED, "max", "max", "max", "worst client")), precision="0"),
  "heap-used": timeseries("Heap used — avg / max",
      "Thresholds mark the 300-400MB resting target from the memory-usage project. Percentiles across clients need a histogram; a gauge cannot provide them.",
      series(bq("A", HEAP_USED, "avg", "avg", "avg", "avg client"),
             bq("B", HEAP_USED, "max", "max", "max", "worst client")),
      unit="bytes", precision="2",
      thresholds=[{"color": "Orange", "label": "300MB target", "unit": "bytes", "value": 314572800},
                  {"color": "Red", "label": "400MB ceiling", "unit": "bytes", "value": 419430400}]),
  "sync-duration": timeseries("Time to sync — min / avg / max",
      "Duration of each completed sync episode, merged across clients. A client that never finishes syncing contributes nothing here — see the stall panel.",
      [composite(
          [bq("A", EPISODE + ".min", "min", "min", "min", "min"),
           bq("B", EPISODE + ".max", "max", "max", "max", "max"),
           bq("C", EPISODE + ".sum", "sum", "sum", "sum", "sum", disabled=True),
           bq("D", EPISODE + ".count", "sum", "sum", "sum", "count", disabled=True)],
          {"disabled": False, "expression": "C / D", "functions": None,
           "having": {"expression": ""}, "legend": "avg", "name": "F1", "order": None},
          kind="time_series")],
      unit="s", precision="2"),
  "sync-stalled": timeseries("Time without sync progress — avg / max",
      "Age of the last decrease in the backlog while a client is not caught up; 0 when caught up. This is the stuck detector: >600s means a client has made no progress for ten minutes.",
      series(bq("A", STALLED, "avg", "avg", "avg", "avg client"),
             bq("B", STALLED, "max", "max", "max", "worst client")),
      unit="s", precision="0",
      thresholds=[{"color": "Red", "label": "10 min stalled", "unit": "s", "value": 600}]),
  "loop-lag-main": timeseries("Event loop lag — main thread",
      "Peak time a timer fired behind schedule per window, i.e. how long the tab was blocked. Main thread lag is felt directly as UI jank.",
      series(bq("A", LAG, "avg", "avg", "avg", "avg", extra_filter="dxos.process.type = 'browser'"),
             bq("B", LAG, "max", "max", "max", "max", extra_filter="dxos.process.type = 'browser'")),
      unit="s", precision="3"),
  "loop-lag-worker": timeseries("Event loop lag — workers",
      "Same measure inside the shared and dedicated workers, where client-services runs. Worker lag does not jank the UI directly; it shows up as RPC queue wait on the panel below.",
      series(bq("A", LAG, "avg", "avg", "avg", "avg {{dxos.process.type}}",
                group=["dxos.process.type"], extra_filter=WORKER_REALMS),
             bq("B", LAG, "max", "max", "max", "max {{dxos.process.type}}",
                group=["dxos.process.type"], extra_filter=WORKER_REALMS)),
      unit="s", precision="3"),
  "rpc-timings": timeseries("RPC queue wait vs service time — max",
      "Queue wait is time the message spent waiting for the thread; service time is time spent working. Queue wait rising while service time is flat means the receiving realm is saturated, not slow.",
      [composite(
          [bq("A", QUEUE_WAIT + ".max", "max", "max", "max", "queue wait max"),
           bq("B", RPC_SERVICE + ".max", "max", "max", "max", "service max"),
           bq("C", QUEUE_WAIT + ".sum", "sum", "sum", "sum", "qw sum", disabled=True),
           bq("D", QUEUE_WAIT + ".count", "sum", "sum", "sum", "qw count", disabled=True)],
          {"disabled": False, "expression": "C / D", "functions": None,
           "having": {"expression": ""}, "legend": "queue wait avg", "name": "F1", "order": None},
          kind="time_series")],
      unit="s", precision="3"),
  "ws-reconnect-reason": timeseries("EDGE reconnects by cause",
      "offline = the browser reported no network; abnormal = closed with no close frame while online; server_error/going_away = the server closed deliberately; inactivity_timeout = the peer went silent while our pings were flowing.",
      series(bq("A", WS_RECONNECT, "increase", "sum", "sum", "{{reason}}", group=["reason"])),
      unit="none", precision="0"),
  "ws-session-reconnects": timeseries("Reconnects per session — avg / max",
      "Counted since the process started, so the value IS the per-session total; it resets on reload. A delta counter cannot answer this.",
      series(bq("A", WS_SESSION, "avg", "avg", "avg", "avg session"),
             bq("B", WS_SESSION, "max", "max", "max", "worst session")),
      unit="none", precision="1"),
  "ws-connected": timeseries("Fleet connectivity",
      "Average of a 0/1 gauge, so this is the fraction of clients with an open EDGE socket.",
      series(bq("A", WS_CONNECTED, "avg", "avg", "avg", "fraction online")),
      unit="none", precision="2"),
  "sync-pending": timeseries("Pending sync work per client — avg / max",
      "Documents plus feed blocks — the same definition the episode and stall instruments use, so this panel and the stall alert agree.",
      series(bq("A", PENDING, "avg", "avg", "avg", "avg client"),
             bq("B", PENDING, "max", "max", "max", "worst client")),
      unit="none", precision="0"),
  "heap-by-device": table("Heaviest clients by heap",
      "One row per device; heapSizeLimit is the browser's cap for that client.",
      [composite([
          bq("A", HEAP_USED, "max", "max", "max", "heap used", group=["deviceKey"], limit=20),
          bq("B", HEAP_LIMIT, "max", "max", "max", "heap limit", group=["deviceKey"], limit=20)])],
      {"A": "bytes", "B": "bytes"}),
}

order = [("stat-spaces",0,0,3,3),("stat-docs",3,0,3,3),("stat-unsynced",6,0,3,3),("stat-heap-pressure",9,0,3,3),
         ("sync-duration",0,3,6,6),("sync-stalled",6,3,6,6),
         ("spaces-dist",0,9,6,6),("spaces-ready",6,9,6,6),
         ("docs-location",0,15,6,6),("unsynced-backlog",6,15,6,6),
         ("sync-pending",0,21,6,6),("ws-connected",6,21,6,6),
         ("ws-reconnect-reason",0,27,6,6),("ws-session-reconnects",6,27,6,6),
         ("loop-lag-main",0,33,6,6),("loop-lag-worker",6,33,6,6),
         ("rpc-timings",0,39,6,6),("heap-used",6,39,6,6),
         ("heap-by-device",0,45,6,6)]

dashboard = {
  "name": "client-metrics-vibptxv0",
  "schemaVersion": "v6",
  "image": "/assets/Icons/eight-ball",
  "tags": [{"key": "tag", "value": "dxos"}, {"key": "tag", "value": "client"}],
  "spec": {
    "display": {"name": "Client Metrics",
      "description": "Per-client SDK metrics from @dxos/observability. Gauges are read at collection time and exported every 60s, so every panel aggregates ACROSS clients: avg/p90/max answer \"what does a typical or bad client look like\", sum answers \"how much is out there in total\". ctx.tag isolates a single local run from deployed traffic."},
    "duration": "", "refreshInterval": "", "links": [],
    "variables": [
      dyn_var("deployment.environment", "Deployment environment; local runs report 'unknown' unless DX_ENVIRONMENT is set."),
      dyn_var("ctx.tag", "Client tag from DX_TELEMETRY_TAG; use it to isolate one run."),
    ],
    "panels": panels,
    "layouts": [{"kind": "Grid", "spec": {"items": [
        {"content": {"$ref": f"#/spec/panels/{pid}"}, "height": h, "width": w, "x": x, "y": y}
        for pid, x, y, w, h in order]}}],
  },
}

with open('.agents/projects/sdk-metrics/dashboard.json', 'w') as f:
    json.dump(dashboard, f, indent=2)
    f.write('\n')
print('panels:', len(panels), '| layout items:', len(order))
