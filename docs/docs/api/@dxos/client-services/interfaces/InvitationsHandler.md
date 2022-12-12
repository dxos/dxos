# Interface `InvitationsHandler`
> Declared in [`packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts`]()

Common interface for Halo and Space invitation proxies and handlers.
Handles the life-cycle of Space invitations between peers.

Host
- Creates an invitation containing a swarm topic (which can be shared via a URL, QR code, or direct message).
- Joins the swarm with the topic and waits for guest's admission request.
- Wait for guest to authenticate with OTP.
- Waits for guest to present credentials (containing local device and feed keys).
- Writes credentials to control feed then exits.

Guest
- Joins the swarm with the topic.
- Sends an admission request.
- Sends authentication OTP.
- If Space handler then creates a local cloned space (with genesis block).
- Sends admission credentials.

TODO(burdon): Show proxy/service relationship and reference design doc/diagram.

  ```
 [Guest]                                          [Host]
  |-----------------------------RequestAdmission-->|
  |-------------------------------[Authenticate]-->|
  |------------------PresentAdmissionCredentials-->|
 ```
## Properties