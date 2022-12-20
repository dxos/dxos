export class EchoSchema {
  static fromJson(json: string): EchoSchema {
    return new EchoSchema();
  }

  getType(name: string): EchoSchemaType {
    return new EchoSchemaType();
  }

  registerPrototype(proto: any) {

  }
}

export class EchoSchemaType {
  createFilter(opts?: any): any {

  }
}
