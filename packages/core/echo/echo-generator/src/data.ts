//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Reconcile with @dxos/plugin-debug, @dxos/aurora/testing.
// TODO(burdon): Bug when adding stale objects to space (e.g., static objects already added in previous story invocation).

import * as S from '@effect/schema/Schema';

import { type Space } from '@dxos/client/echo';
import * as E from '@dxos/echo-schema';
import { DynamicEchoSchema, effectToJsonSchema, StoredEchoSchema } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

import { SpaceObjectGenerator, TestObjectGenerator } from './generator';
import { type TestGeneratorMap, type TestSchemaMap } from './types';

// TODO(burdon): Handle restricted values.
export const Status = ['pending', 'active', 'done'];
export const Priority = [1, 2, 3, 4, 5];

export enum TestSchemaType {
  document = 'example.com/schema/document',
  organization = 'example.com/schema/organization',
  contact = 'example.com/schema/contact',
  project = 'example.com/schema/project',
}

const createDynamicSchema = (typename: string, fields: S.Struct.Fields): DynamicEchoSchema => {
  const typeSchema = S.partial(S.struct(fields)).pipe(E.echoObject(typename, '1.0.0'));
  return new DynamicEchoSchema(
    E.object(StoredEchoSchema, {
      typename,
      version: '1.0.0',
      jsonSchema: effectToJsonSchema(typeSchema),
    }),
  );
};

const testSchemas = (): TestSchemaMap<TestSchemaType> => {
  const document = createDynamicSchema(TestSchemaType.document, {
    title: S.string.pipe(S.description('title of the document')),
    content: S.string,
  });

  const organization = createDynamicSchema(TestSchemaType.organization, {
    name: S.string.pipe(S.description('name of the company or organization')),
    website: S.string.pipe(S.description('public website URL')),
    description: S.string.pipe(S.description('short summary of the company')),
  });

  const contact = createDynamicSchema(TestSchemaType.contact, {
    name: S.string.pipe(S.description('name of the person')),
    email: S.string,
    org: E.ref(organization),
    lat: S.number,
    lng: S.number,
  });

  const project = createDynamicSchema(TestSchemaType.project, {
    name: S.string.pipe(S.description('name of the project')),
    description: S.string,
    website: S.string,
    repo: S.string,
    status: S.string,
    priority: S.number,
    active: S.boolean,
    org: E.ref(organization),
  });

  return {
    [TestSchemaType.document]: document,
    [TestSchemaType.organization]: organization,
    [TestSchemaType.contact]: contact,
    [TestSchemaType.project]: project,
  };
};

const testObjectGenerators: TestGeneratorMap<TestSchemaType> = {
  [TestSchemaType.document]: () => ({
    title: faker.lorem.sentence(3),
    content: faker.lorem.sentences({ min: 1, max: faker.number.int({ min: 1, max: 3 }) }),
  }),

  [TestSchemaType.organization]: () => ({
    name: faker.company.name(),
    website: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : undefined,
    description: faker.lorem.sentences(),
  }),

  [TestSchemaType.contact]: (provider) => {
    const organizations = provider?.(TestSchemaType.organization);
    const location = faker.datatype.boolean() ? faker.helpers.arrayElement(locations) : undefined;
    return {
      name: faker.person.fullName(),
      email: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.email() : undefined,
      org:
        organizations?.length && faker.datatype.boolean({ probability: 0.3 })
          ? faker.helpers.arrayElement(organizations)
          : undefined,
      ...location,
    };
  },

  [TestSchemaType.project]: () => ({
    name: faker.commerce.productName(),
    repo: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.url() : undefined,
    status: faker.helpers.arrayElement(Status),
    priority: faker.helpers.arrayElement(Priority),
    active: faker.datatype.boolean(),
  }),
};

export const createTestObjectGenerator = () => new TestObjectGenerator(testSchemas(), testObjectGenerators);

export const createSpaceObjectGenerator = (space: Space) =>
  new SpaceObjectGenerator(space, testSchemas(), testObjectGenerators);

// TODO(burdon): Move to @dxos/random.
const locations = [
  { lat: 139.74946157054467, lng: 35.686962764371174 },
  { lat: -73.98196278740681, lng: 40.75192492259464 },
  { lat: -99.1329340602939, lng: 19.444388301415472 },
  { lat: 72.85504343876647, lng: 19.0189362343566 },
  { lat: -46.62696583905523, lng: -23.55673372837896 },
  { lat: 77.22805816860182, lng: 28.671938757181522 },
  { lat: 121.43455881982015, lng: 31.218398311228327 },
  { lat: 88.32272979950551, lng: 22.49691515689642 },
  { lat: 90.40663360810754, lng: 23.725005570312817 },
  { lat: -58.399477232331435, lng: -34.600555749907414 },
  { lat: -118.18192636994041, lng: 33.99192410876543 },
  { lat: 66.98806305137339, lng: 24.87193814681484 },
  { lat: 31.248022361126118, lng: 30.051906205103705 },
  { lat: -43.22696665284366, lng: -22.923077315615956 },
  { lat: 135.4581989565952, lng: 34.75198107491417 },
  { lat: 116.38633982565943, lng: 39.93083808990906 },
  { lat: 120.9802713035424, lng: 14.606104813440538 },
  { lat: 37.6135769672714, lng: 55.75410998124818 },
  { lat: 29.008055727002613, lng: 41.10694201243979 },
  { lat: 2.33138946713035, lng: 48.86863878981461 },
  { lat: 126.99778513820195, lng: 37.56829495838895 },
  { lat: 3.3895852125984334, lng: 6.445207512093191 },
  { lat: 106.82749176247012, lng: -6.172471846798885 },
  { lat: -87.75200083270931, lng: 41.83193651927843 },
  { lat: 113.32306427226172, lng: 23.14692716047989 },
  { lat: -0.11866770247593195, lng: 51.5019405883275 },
  { lat: -77.05200795343472, lng: -12.04606681752557 },
  { lat: 51.42239817500899, lng: 35.673888627001304 },
  { lat: 15.313026023171744, lng: -4.327778243275986 },
  { lat: -74.08528981377441, lng: 4.598369421147822 },
  { lat: 114.1201772298325, lng: 22.554316369677963 },
  { lat: 114.26807118958311, lng: 30.581977209337822 },
  { lat: 114.18306345846304, lng: 22.30692675357551 },
  { lat: 117.19807322410043, lng: 39.13197212310894 },
  { lat: 80.27805287890033, lng: 13.091933670856292 },
  { lat: 121.568333333333, lng: 25.0358333333333 },
  { lat: 77.55806386521755, lng: 12.97194099507442 },
  { lat: 100.51469879369489, lng: 13.751945064087977 },
  { lat: 74.34807892054346, lng: 31.56191739488844 },
  { lat: 106.59303578916195, lng: 29.566922888044644 },
  { lat: 78.47800771287751, lng: 17.401928991511454 },
  { lat: -70.66898671317483, lng: -33.448067956934096 },
  { lat: -80.22605193945003, lng: 25.789556555021534 },
  { lat: -43.916950376804834, lng: -19.91308016391116 },
  { lat: -3.6852975446125242, lng: 40.40197212311381 },
  { lat: -75.17194183200792, lng: 40.001919022526465 },
  { lat: 72.57805776168215, lng: 23.031998775062675 },
  { lat: 106.69308136207889, lng: 10.781971309193409 },
  { lat: -79.42196665298843, lng: 43.70192573640844 },
  { lat: 103.85387481909902, lng: 1.2949793251059418 },
  { lat: 13.23248118266855, lng: -8.836340255012658 },
  { lat: 44.391922914564134, lng: 33.34059435615865 },
  { lat: 2.181424460619155, lng: 41.385245438547486 },
  { lat: 88.32994665421205, lng: 22.580390440861947 },
  { lat: -96.84196278749818, lng: 32.82196968167733 },
  { lat: 123.44802765120869, lng: 41.80692512604918 },
  { lat: 32.532233380011576, lng: 15.590024084277673 },
  { lat: 73.84805776168719, lng: 18.531963374654026 },
  { lat: 151.1832339501475, lng: -33.91806510862875 },
  { lat: 30.314074200315076, lng: 59.94096036375191 },
  { lat: 91.79802154756635, lng: 22.33193814680459 },
  { lat: 113.74277634138707, lng: 23.050834758613007 },
  { lat: -84.40189524187565, lng: 33.83195971260585 },
  { lat: -71.07195953218684, lng: 42.33190600170229 },
  { lat: 46.770795798688255, lng: 24.642779007816443 },
  { lat: -95.341925149146, lng: 29.821920243188856 },
  { lat: 105.8480683412422, lng: 21.035273107737055 },
  { lat: -77.01136443943716, lng: 38.901495235087054 },
  { lat: -103.33198008081848, lng: 20.671961950508944 },
  { lat: 144.97307037590406, lng: -37.81808545369631 },
  { lat: 29.948050030391755, lng: 31.201965205759393 },
  { lat: 104.06807363094873, lng: 30.671945877957796 },
  { lat: -83.0820016464927, lng: 42.33190600170229 },
  { lat: 96.16473175266185, lng: 16.785299963188777 },
  { lat: 108.89305043760862, lng: 34.27697130928732 },
  { lat: -51.20195790450316, lng: -30.048068770722466 },
  { lat: 121.465, lng: 25.0127777777778 },
  { lat: 72.83809356897484, lng: 21.20192960187819 },
  { lat: 109.60911291406296, lng: 23.09653464659317 },
  { lat: -4.041994118507091, lng: 5.321942826098564 },
  { lat: -47.91799814700306, lng: -15.781394372878992 },
  { lat: 32.862445782356644, lng: 39.929184444075474 },
  { lat: -100.33193064232995, lng: 25.671940995125283 },
  { lat: 139.60202098994017, lng: 35.43065615270891 },
  { lat: 118.77802846499208, lng: 32.05196500231233 },
  { lat: -73.58524281670213, lng: 45.50194506421502 },
  { lat: 106.7180927553083, lng: 26.581988806001448 },
  { lat: -34.91755136960728, lng: -8.073699467249241 },
  { lat: 126.64803904445057, lng: 45.75192980542715 },
  { lat: -38.58192718342411, lng: -3.7480720258257634 },
  { lat: -112.07193755969467, lng: 33.5419257363676 },
  { lat: 117.67001623440774, lng: 24.520375385531167 },
  { lat: -38.48193328693924, lng: -12.968026046044827 },
  { lat: 129.00810170722048, lng: 35.09699877511093 },
  { lat: -122.41716877355225, lng: 37.76919562968743 },
  { lat: 28.028063865019476, lng: -26.16809888138414 },
  { lat: 13.399602764700546, lng: 52.523764522251156 },
  { lat: 3.048606670909237, lng: 36.765010656628135 },
  { lat: 125.75274485499392, lng: 39.02138455800434 },
  { lat: 12.481312562873995, lng: 41.89790148509894 },
];
