# Compute

- This folder represents a "compute plugin" for the Canvas component.
- It defines a set of Shapes that implement a state machine.

### Notes (burdon)

- [x] Text/markdown view (parse cot, etc.)
- [x] Surface view
- [ ] Prompt with handlebar variables (dynamic schema)
- [ ] Artifact tool (find artifact defintions AND instances); conext (e.g., current game).
  - [ ] Chess plugin defines artifact to generate and process FEN?
  - [ ] Deploy funciton to play game.
- [ ] Function node (call script)
- [ ] Group nodes (sub-graph)
- [ ] Markdown surface node (parse COT)
- [ ] Auto layout graphs

### Notes (dmaretskyi)

- Consider how different types of edges affect computations:
  - Being able to provide values by reference
    - e.g. GPT gets connected to a vector index that is represented by a separate node that can be queried
    - history node can be provided by reference (as a mutable Thread object) that GPT mutates without requiring a back reference
  - Consider separating purely functional inputs from imperative ones
    - This is what UnrealEngine does - functional inputs trigger computations when the data changes, imperative inputs can trigger computations with the same or no data
    - imperative inputs can represent events or streams of data
    - functional inputs represent values

- persisting compute graph and canvas in ECHO
  - (Canvas)-[.nodes]->(CanvasNode)-[.node]->(ComputeNode)<-[.nodes]-(ComputeGraph), (Canvas)-[.computeGraph]->(ComputeGraph)

  - Computations can operate purely on the ComputeGraph
  - Computations return an ExecutionTrace that is streamable
  - Canvas graph doesn't directly interact with the compute graph, but reads the execution trace

  - ExecutionTrace
    - has an execution trace id -- one graph can have multiple independent parallel traces
    - series of events - each event is associated with a particular node in a particular graph
    - events include:
      - inputs/outputs being updated
      - logs associated with a node or a graph
      - node state updates (can a node have internal state separate from inputs/outputs)
      - timestep? - to correlate events that happen during a single execution time



