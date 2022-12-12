---
order: 4
---

# Spaces

Spaces are the unit of sharing and access control in ECHO. Roughly equivalent to a "collection" in a document store, a space is a logical boundary around a set of items which are to be replicated amongst a set of peer members of the space. A given is typically a part of many spaces at any given time.

There are several steps to establishing a space between peers:

1.  Peer A listens on the peer network for peers intereseted in a specific invite code
2.  Peer B obtains the invite code and locates the listening peer A via the signaling network
3.  Peer A and B establish a secure connection via Diffie Hellmann key exchange
4.  Peer A decides on a secret PIN code
5.  To complete the connection, Peer B must provide the PIN code to Peer A over the secure connection

After a space with a peer is established, the peer's public ket becomes "known" to the user's HALO and subsequent mutual spaces are easier to negotiate.

```ts file=./snippets/obtain-space.ts#L5-
```
