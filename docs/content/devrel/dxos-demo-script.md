# DXOS Demo Script

This is Jess's demo script. Feel free to use it if it's helpful for you!

1. Show a todo app. "Todos in this app are backed by a client-side database."

- https://dxos-tasks.netlify.app
- close window, re-open
- show no network requests when adding, updating todos
- not just in-memory state, but saved to disk in the browser

2. The client-side database also give you shared state across multiple tabs or windows in the same browser

- open new window, show todos syncing between windows

3. Can also synchronize with other devices

- invite a new device to the space
- show the invite flow

4. Identity is managed via private keys

- show creating an identity on the second device
- show collab and syncing between two devices

5. Also, communication between devices is peer2peer, so it works without internet

- DXOS Dev Tools
  - show the data browser
  - show the other members of the swarm
  - show that signaling server is disconnected
- shut off the internet using DXOS DevTools
  - "Toggle Connection" will disconnect me from signaling AND other swarm members
- show devices staying in sync - yay CRDTs!
  - CRDT-powered data structures

6. Apps can also interop over the client-side data store

- show a different kanban app staying in sync with the todo list
- https://dxos-kanban.netlify.app

7. The entire todo app is ~100 lines of pretty simple React code.

- show the source code for the todo list app
- make a simple change?
  - make todos already done when created
