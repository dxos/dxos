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
  "spaces-dist": timeseries("Spaces per client — avg / p90 / max",
      "Distribution across clients; a gauge cannot be summed meaningfully, so these are spatial aggregations within each bucket.",
      series(bq("A", SPACES, "avg", "avg", "avg", "avg"),
             bq("B", SPACES, "avg", "p90", "avg", "p90"),
             bq("C", SPACES, "max", "max", "max", "max"))),
  "spaces-ready": timeseries("Known vs ready spaces (avg per client)",
      "The gap is spaces the client knows about but has not opened.",
      series(bq("A", SPACES, "avg", "avg", "avg", "known"),
             bq("B", READY, "avg", "avg", "avg", "ready"))),
  "docs-location": timeseries("Documents per client by location",
      "local vs remote; they converge when the client is fully synced.",
      series(bq("A", DOCS, "avg", "avg", "avg", "{{location}}", group=["location"])), precision="0"),
  "unsynced-backlog": timeseries("Unsynced backlog — worst / avg client",
      "A max that stays flat while avg sits near 0 is a single stuck client — what the Phase 4 sync-stall instruments will make explicit.",
      series(bq("A", UNSYNCED, "max", "max", "max", "worst client"),
             bq("B", UNSYNCED, "avg", "avg", "avg", "avg client")), precision="0"),
  "heap-used": timeseries("Heap used — p50 / p90 / max",
      "Thresholds mark the 300-400MB resting target from the memory-usage project.",
      series(bq("A", HEAP_USED, "avg", "p50", "avg", "p50"),
             bq("B", HEAP_USED, "avg", "p90", "avg", "p90"),
             bq("C", HEAP_USED, "max", "max", "max", "max")),
      unit="bytes", precision="2",
      thresholds=[{"color": "Orange", "label": "300MB target", "unit": "bytes", "value": 314572800},
                  {"color": "Red", "label": "400MB ceiling", "unit": "bytes", "value": 419430400}]),
  "heap-by-device": table("Heaviest clients by heap",
      "One row per device; heapSizeLimit is the browser's cap for that client.",
      [composite([
          bq("A", HEAP_USED, "max", "max", "max", "heap used", group=["deviceKey"], limit=20),
          bq("B", HEAP_LIMIT, "max", "max", "max", "heap limit", group=["deviceKey"], limit=20)])],
      {"A": "bytes", "B": "bytes"}),
}

order = [("stat-spaces",0,0,3,3),("stat-docs",3,0,3,3),("stat-unsynced",6,0,3,3),("stat-heap-pressure",9,0,3,3),
         ("spaces-dist",0,3,6,6),("spaces-ready",6,3,6,6),
         ("docs-location",0,9,6,6),("unsynced-backlog",6,9,6,6),
         ("heap-used",0,15,6,6),("heap-by-device",6,15,6,6)]

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
