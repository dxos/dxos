import { getTypename, isInstanceOf, setTypename, type HasId, type HasMeta, type HasTypename } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { ServiceType } from '@dxos/plugin-automation/types';
import { services } from '../data/services';
import { RegistryClient } from '../registry/client';
import { REGISTRY_URL } from './config';

const SPACE_ID = SpaceId.fromString('B33ERQMJLDMUN6JAC5NSEUODS2LTDKBR6');
const VERSION = '0.1.0';

const client = new RegistryClient(REGISTRY_URL);

client.publish(services.map(prepareObject));

function getName(object: HasId & HasTypename): string | undefined {
  if (isInstanceOf(ServiceType, object)) {
    return object.serviceId;
  } else {
    return undefined;
  }
}

function prepareObject(object: HasId & HasTypename): HasId & HasTypename & HasMeta {
  const res = structuredClone(object) as HasId & HasTypename & HasMeta;
  setTypename(res, getTypename(object)!);

  res['@meta'] ??= { keys: [] };
  const name = getName(object);
  if (name) {
    res['@meta']!.name = name;
    res['@meta']!.version = VERSION;
  }
  res['@meta']!.space = SPACE_ID;
  return res;
}
