//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { ComplexMap } from '@dxos/util';

import { DATA_NAMESPACE, EchoReactiveHandler } from './echo-handler';
import {
  type ObjectInternals,
  type ProxyTarget,
  symbolInternals,
  symbolNamespace,
  symbolPath,
} from './echo-proxy-target';
import { AutomergeObjectCore } from '../automerge';
import {
  SchemaValidator,
  getMeta,
  getSchema,
  requireTypeReference,
  createReactiveProxy,
  getProxyHandlerSlot,
  isReactiveObject,
} from '../effect';
import type { EchoReactiveObject } from '../effect';
import { type ObjectMeta } from '../object';

export const isEchoObject = (value: unknown): value is EchoReactiveObject<any> =>
  isReactiveObject(value) && getProxyHandlerSlot(value).handler instanceof EchoReactiveHandler;

export const createEchoObject = <T extends {}>(init: T): EchoReactiveObject<T> => {
  const schema = getSchema(init);
  if (schema != null) {
    validateSchema(schema);
  }

  if (isReactiveObject(init)) {
    const proxy = init as any;

    const slot = getProxyHandlerSlot(proxy);
    const meta = getProxyHandlerSlot<ObjectMeta>(getMeta(proxy)).target!;

    const core = new AutomergeObjectCore();
    core.rootProxy = proxy;

    slot.handler = EchoReactiveHandler.instance;
    const target = slot.target as ProxyTarget;

    target[symbolInternals] = {
      core,
      targetsMap: new ComplexMap((key) => JSON.stringify(key)),
    };
    target[symbolPath] = [];
    target[symbolNamespace] = DATA_NAMESPACE;
    slot.handler._proxyMap.set(target, proxy);
    slot.handler._init(target);
    saveTypeInAutomerge(target[symbolInternals], schema);
    if (meta && meta.keys.length > 0) {
      target[symbolInternals].core.setMeta(meta);
    }
    return proxy;
  } else {
    const core = new AutomergeObjectCore();
    const target: ProxyTarget = {
      [symbolInternals]: {
        core,
        targetsMap: new ComplexMap((key) => JSON.stringify(key)),
      },
      [symbolPath]: [],
      [symbolNamespace]: DATA_NAMESPACE,
      ...(init as any),
    };
    const proxy = createReactiveProxy<ProxyTarget>(target, EchoReactiveHandler.instance) as any;
    core.rootProxy = proxy;
    saveTypeInAutomerge(target[symbolInternals], schema);
    return proxy;
  }
};

export const initEchoReactiveObjectRootProxy = (core: AutomergeObjectCore) => {
  const target: ProxyTarget = {
    [symbolInternals]: {
      core,
      targetsMap: new ComplexMap((key) => JSON.stringify(key)),
    },
    [symbolPath]: [],
    [symbolNamespace]: DATA_NAMESPACE,
  };
  core.rootProxy = createReactiveProxy<ProxyTarget>(target, EchoReactiveHandler.instance) as any;
};

const validateSchema = (schema: S.Schema<any>) => {
  requireTypeReference(schema);
  SchemaValidator.validateSchema(schema);
};

const saveTypeInAutomerge = (internals: ObjectInternals, schema: S.Schema<any> | undefined) => {
  if (schema != null) {
    internals.core.setType(requireTypeReference(schema));
  }
};
