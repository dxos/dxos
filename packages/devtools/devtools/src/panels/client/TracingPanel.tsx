import { Resource, Span } from "@dxos/protocols/proto/dxos/tracing";
import { useClient } from "@dxos/react-client";
import React, { useEffect, useRef, useState } from "react";
import { JsonView } from "../../components";
import { FlameGraph } from 'react-flame-graph';

type State = {
  resources: Map<number, Resource>
  spans: Map<number, Span>
}

const TracingPanel = () => {
  const client = useClient();
  const state = useRef<State>({
    resources: new Map<number, Resource>(),
    spans: new Map<number, Span>(),
  })
  const [,forceUpdate] = useState({});

  useEffect(() => {
    const stream = client.services.services.TracingService!.streamTrace()
    stream.subscribe((data) => {
      for(const event of data.resourceAdded ?? []) {
        state.current.resources.set(event.resource.id, event.resource)
      }
      for(const event of data.resourceRemoved ?? []) {
        state.current.resources.delete(event.id)
      }
      for(const event of data.spanAdded ?? []) {
        state.current.spans.set(event.span.id, event.span)
      }
      forceUpdate({});
    }, (error) => {
      console.error(error)
    })
    return () => {
      stream.close()
    }
  }, [])

  
  const rootSpan = [...state.current.spans.values()].find((s) => s.parentId === undefined);
  const flameGraph = buildFlameGraph(state.current, rootSpan?.id ?? 0);

  if(flameGraph === undefined) {
    return
  }

  return (
    <FlameGraph
      data={flameGraph}
      height={200}
      width={400}
    />
  );

  return (
    <JsonView
      data={{
        resources: [...state.current.resources.values()],
        spans: [...state.current.spans.values()],
        flameGraph: flameGraph
      }}
    />
  )
}


const buildFlameGraph = (state: State, rootId: number): any => {
  const span = state.spans.get(rootId)
  if(!span) {
    return undefined
  }

  const childSpans = [...state.spans.values()].filter((s) => s.parentId === span.id);

  const resource = span.resourceId !== undefined ? state.resources.get(span.resourceId) : undefined;

  const name = resource ? `${resource.className}#${resource.instanceId}.${span.methodName}` : span.methodName;

  return {
    name,
    value: +(span.endTs ?? '999') - (+span.startTs),
    children: childSpans.map(s => buildFlameGraph(state, s.id))
  }
}

export default TracingPanel;