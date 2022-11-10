# Interface `InvitationsHandler`
> Declared in [`packages/sdk/client-services/src/packlets/invitations/invitations.ts`]()

Common interface for Halo and Space invitation proxies and handlers.
Handles the life-cycle of Space invitations between peers.

Host
- Creates an invitation containing a swarm topic.
- Joins the swarm with the topic and waits for guest's admission request.
- Responds with admission offer then waits for guest's credentials.
- Writes credentials to control feed then exits.

Guest
- Joins the swarm with the topic.
- NOTE: The topic is transmitted out-of-band (e.g., via a QR code).
- Sends an admission request.
- If Space handler then creates a local cloned space (with genesis block).
- Sends admission credentials (containing local device and feed keys).

TODO(burdon): Show proxy/service relationship and reference design doc/diagram.

  ```
 [Guest]                                                  [Host]
  |-------------------------------------RequestAdmission-->|
  |<--AdmissionOffer---------------------------------------|
  |
  |--------------------------PresentAdmissionCredentials-->|
 ```
## Properties