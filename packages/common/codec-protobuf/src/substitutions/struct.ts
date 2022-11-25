//
// Copyright 2022 DXOS.org
//

export type BasicType = null | undefined | number | string | boolean;
export type StructValue = BasicType | Object | (BasicType | Object)[];
export type Struct = Record<string, StructValue>;

const encodeStructValue = (value: StructValue): any => {
  const encoders: Record<string, (v: any) => any> = {
    '[object Null]': () => ({ nullValue: 0 }),
    '[object Undefined]': () => ({ nullValue: 0 }),
    '[object Number]': (value: number) => ({ numberValue: value }),
    '[object String]': (v: string) => ({ stringValue: v }),
    '[object Boolean]': (v: boolean) => ({ boolValue: v }),
    '[object Object]': (v: Struct) => ({ structValue: encodeStruct(v) }),
    '[object List]': (v: StructValue[]) => ({ listValue: { values: v.map(encodeStructValue) } })
  };
  const valueType = Object.prototype.toString.call(value);
  if (valueType in encoders) {
    return encoders[valueType](value);
  } else {
    throw new Error(`Unsupported type: ${valueType}`);
  }
};

const encodeStruct = (value: Struct): any => {
  const fields = Object.entries(value).map(([key, value]) => ({ [key]: encodeStructValue(value) }));
  return { fields };
};

const decodeStructValue = (value: any): StructValue => {
  const decoders: Record<string, (v: any) => any> = {
    nullValue: () => null,
    numberValue: (v: number) => v,
    stringValue: (v: string) => v,
    boolValue: (v: boolean) => v,
    structValue: (v: Struct) => decodeStruct(v),
    listValue: (v: { values: StructValue[] }) => v.values.map(decodeStructValue)
  };
  const valueType = Object.keys(value)[0];
  if (valueType in decoders) {
    return decoders[valueType](value[valueType]);
  } else {
    throw new Error(`Unsupported type: ${valueType}`);
  }
};

const decodeStruct = (value: any): Struct => {
  const fields = value.fields || {};
  return Object.entries(fields).reduce((acc, [key, value]) => {
    acc[key] = decodeStructValue(value);
    return acc;
  }, {} as Struct);
};

export const structSubstitutions = {
  'google.protobuf.Struct': {
    encode: (value: Struct): any => encodeStruct(value),
    decode: (value: any): Struct => decodeStruct(value)
  }
};
