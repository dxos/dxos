# Class `MemoryRegistryClientBackend`
> Declared in [`packages/sdk/registry-client/src/testing/memory-registry-client.ts`](https://github.com/dxos/protocols/blob/main/packages/sdk/registry-client/src/testing/memory-registry-client.ts#L28)

In-memory implementation of the registry client with statically specified records.
Useful for testing code which relies on the DXNS registry without connecting to a real node.

## Constructors
```ts
new MemoryRegistryClientBackend(

)
```

---
- MemoryRegistryClientBackend : Class
- constructor : Constructor
- new MemoryRegistryClientBackend : Constructor signature
- authorities : Property
- records : Property
- resources : Property
- getDomainKey : Method
- getDomainKey : Call signature
- domainName : Parameter
- getRecord : Method
- getRecord : Call signature
- cid : Parameter
- getResource : Method
- getResource : Call signature
- name : Parameter
- listAuthorities : Method
- listAuthorities : Call signature
- listRecords : Method
- listRecords : Call signature
- listResources : Method
- listResources : Call signature
- registerAuthority : Method
- registerAuthority : Call signature
- owner : Parameter
- registerDomainName : Method
- registerDomainName : Call signature
- domainName : Parameter
- owner : Parameter
- registerRecord : Method
- registerRecord : Call signature
- record : Parameter
- registerResource : Method
- registerResource : Call signature
- name : Parameter
- cid : Parameter
- owner : Parameter
