/**
 * Query active room members.
 * Other members reply with `announce` message.
 */
export type QueryMeetProtocolMessage = {
  type: 'query';
  senderId: string;
};

/**
 * Sent in response to a query message, on join, or metadata change.
 */
export type AnnounceMeetProtocolMessage = {
  type: 'announce';
  senderId: string;
  metadata: {};
};

/**
 * Request another peer to send a WebRTC offer to us.
 * Only sent if `senderId >= targetId`, otherwise we send an offer directly.
 */
export type DialMeetProtocolMessage = {
  type: 'dial';
  senderId: string;
  targetId: string;
};

/**
 * WebRTC offer.
 */
export type OfferMeetProtocolMessage = {
  type: 'offer';
  senderId: string;
  targetId: string;
  offer: {};
};

/**
 * WebRTC answer.
 */
export type AnswerMeetProtocolMessage = {
  type: 'answer';
  senderId: string;
  targetId: string;
  answer: {};
};

/**
 * WebRTC ice candidate.
 */
export type IceCandidateMeetProtocolMessage = {
  type: 'ice-candidate';
  senderId: string;
  targetId: string;
  candidate: {};
};

/**
 * Sent when we leave the room.
 */
export type LeaveMeetProtocolMessage = {
  type: 'leave';
  senderId: string;
};

export type MeetProtocolMessage =
  | QueryMeetProtocolMessage
  | AnnounceMeetProtocolMessage
  | DialMeetProtocolMessage
  | OfferMeetProtocolMessage
  | AnswerMeetProtocolMessage
  | IceCandidateMeetProtocolMessage
  | LeaveMeetProtocolMessage;
