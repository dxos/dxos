export type Resource = {
  id: number;
  className: string;
  instanceId: number;

  info: {
    [key: string]: any;
  }

  links: ResourceLink[];
}

export type Span = {
  id: number;
  resourceId: number | null;
  methodName: string;
  
  /**
   * Parent span id.
   */
  parentId: number | null;

  startTs: number;
  endTs: number | null;
  error: TraceError | null;
}

export type TraceError = {
  message: string;
}

export type ResourceLink = {
  from: number;
  to: number;
  attributes: {
  }
}