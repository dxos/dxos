# Runtime Spec

## RB: Notes

- TODO: Set-out basic design-doc process and structure
- TODO: Notes from White paper Google doc
- TODO: Packlets to enforce layer isolation?
  - Factor out ECHO/HALO dispatch (e.g., make PartyManager, Database pluggable)

- Party Manager
  - DAG of feeds
  - DAG of user claims

- Describe basic 3-stage pipeline
  - Disambiguation ECHO, HALO, MESH

- Genesis feed
  - Control feeds
  - Credentials (transitive claims)
  - Separate wholistic tests

- Snaphosts/Epochs

- Time travel/Undo
  - Git/blockchain analogies

- HALO groups

- Light-weight parties (isolation, esp. relating to epochs/undo)
  - Consider party with 1 chess game and 100 coordinated items

- Cross-party linking

- Typed Object models (schema as first-class entities)

- ECHO store without HALO?

- Async client/service architecture
