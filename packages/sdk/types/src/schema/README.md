# Schema.org

## Issues

- Many properties in schema.org accept very different types (e.g., `Organization.address` => `PostalAddress` or `Text`; `latitude` => `Number` or `Text`)
- Low-level DataTypes clash with some existing DXOS types that have other established standards (e.g., `Place.latitude` vs. `GeoPoint` from `@dxos/schema` `format.ts`);
- Many types have relatively obscure properties (e.g., `Place.hasDriveThroughService`).
- Optional/required/cardinality isn't defined (e.g., `Person.email`).
- Relationships aren't defined (often conflated with schema: e.g., `Person.owns`, `Person.relatedTo`).

## Alternatives to Schema.org

1. JSON Schema (Most Popular Alternative)

- URL: https://json-schema.org/
- Strengths:
  - Industry standard for validating JSON documents
  - Programming language agnostic
  - Strong tooling ecosystem (validators, generators, IDE support)
  - Precise cardinality and type constraints
  - Supports composition (allOf, anyOf, oneOf)
  - Better for API contracts and data validation
- Weaknesses:
  - Not as semantically rich as schema.org
  - Focused on structure validation, not semantic web
  - No built-in vocabulary for common domain concepts

2. Dublin Core Metadata Initiative (DCMI)

- URL: https://www.dublincore.org/
- Strengths:
  - Well-established (since 1995)
  - Focused on digital resources and metadata
  - Simpler than schema.org
  - Strong library/academic adoption
- Weaknesses:
  - More limited scope than schema.org
  - Less frequently updated

3. FOAF (Friend of a Friend)

- URL: http://xmlns.com/foaf/spec/
- Strengths:
  - Excellent for social networks and people/organization data
  - RDF-based (semantic web)
  - Well-defined cardinality
- Weaknesses:
  - Limited to social/identity domain
  - Less active development
  - Superseded by schema.org for many use cases

4. Wikidata

- URL: https://www.wikidata.org/
- Strengths:
  - Massive vocabulary (100M+ entities)
  - Multilingual
  - Community-maintained
  - Linked to real-world data
  - Strong property definitions with constraints
- Weaknesses:
  - Can be overwhelming
  - More for knowledge graphs than data modeling

5. OpenAPI/Swagger Schema

- URL: https://spec.openapis.org/
- Strengths:
  - Industry standard for REST APIs
  - Excellent tooling
  - Precise type definitions
  - Based on JSON Schema
- Weaknesses:
  - API-focused, not general purpose
  - Not semantic web oriented

6. Protobuf/gRPC Schema

- URL: https://protobuf.dev/
- Strengths:
  - Strong typing
  - Version management
  - Excellent performance
  - Language-neutral
- Weaknesses:
  - Not semantically rich
  - Primarily for RPC/serialization

7. Apache Avro

- URL: https://avro.apache.org/
- Strengths:
  - Rich data structures
  - Schema evolution support
  - Compact serialization
- Weaknesses:
  - Big data focused
  - Not semantic web

## Selected Types

Below is a select list of types from Schema.org.

- DataType
  - Boolean
  - Date
  - DateTime
  - Number
    - Float
    - Integer
  - Text
    - URL
  - Time

- Thing
  - Action
  - CreativeWork
    - Comment
    - Dataset
      - DataFeed
    - MediaObject
      - TextObject
  - Event
  - Intangible
    - Class
    - DefinedTerm
    - Enumeration
    - ItemList
    - Occupation
    - Order
    - OrderItem
    - Quantity
    - Reservation
    - Schedule
    - Service
    - StructuredValue
      - ContactPoint
        - PostalAddress
      - GeoShape
      - PropertyValue
      - QuantitativeValue
    - Trip
  - Organization
  - Person
  - Place
    - Country
  - Product
  - Reservation
