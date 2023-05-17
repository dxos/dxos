//
// Copyright 2023 DXOS.org
//

export type Command = 'begin' | 'end' | 'update';

export type TraceStatus = 'ok' | 'error';

export type DataType = Record<string, any>;

export type TracingContext = {
  span?: {
    id: string;
    command?: Command;
    parent?: string;
    status?: TraceStatus;
    data?: DataType;
  };
};

export type Trace = {
  begin: (opts: { id: string; parentId?: string; data?: DataType }) => TracingContext;
  end: (opts: { id: string; status?: 'ok' | 'error'; data?: DataType }) => TracingContext;
  update: (opts: { id: string; data: DataType }) => TracingContext;
  error: (opts: { id: string; error: Error; data?: DataType }) => TracingContext;
};

export const trace: Trace = {
  begin: ({ id, parentId, data }) => {
    return {
      span: {
        command: 'begin',
        id,
        parent: parentId,
        data,
      },
    };
  },

  end: ({ id, status, data }) => {
    return {
      span: {
        command: 'end',
        id,
        status: status ?? 'ok',
        data,
      },
    };
  },

  update: ({ id, data }) => {
    return {
      span: {
        command: 'update',
        id,
        data,
      },
    };
  },

  error: ({ id, error, data }) => {
    return {
      span: {
        command: 'end',
        id,
        status: 'error',
        data: {
          errorMessage: error.message,
          errorName: error.name,
          errorStack: error.stack,
          ...data,
        },
      },
    };
  },
};
