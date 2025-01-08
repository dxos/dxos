import { Effect, Context } from 'effect';

export type ComputeEvent =
  | {
      type: 'begin-compute';
      nodeId: string;
      inputs: Record<string, any>;
    }
  | {
      type: 'end-compute';
      nodeId: string;
      outputs: Record<string, any>;
    }
  | {
      type: 'custom';
      nodeId: string;
      event: any;
    };

export class EventLogger extends Context.Tag('EventLogger')<
  EventLogger,
  { readonly log: (event: ComputeEvent) => void }
>() {}
