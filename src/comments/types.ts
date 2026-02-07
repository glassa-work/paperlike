import type { DocId, BlockId, DrawingId, ElementId, CommentId, ActorId } from "../types/ids.js";

/** A comment anchor refers to a location in the document */
export type CommentAnchor =
  | { readonly kind: "block"; readonly blockId: BlockId }
  | { readonly kind: "drawing"; readonly drawingId: DrawingId }
  | { readonly kind: "element"; readonly drawingId: DrawingId; readonly elementId: ElementId };

/** A single comment entry */
export interface Comment {
  readonly id: CommentId;
  readonly docId: DocId;
  readonly authorId: ActorId;
  readonly anchor: CommentAnchor;
  readonly text: string;
  readonly createdAt: number;
  readonly resolved: boolean;
}

/** Comment sync events sent over the comments stream */
export interface CommentSyncStateVector {
  readonly type: "comment_sync_state_vector";
  readonly docId: DocId;
  readonly stateVector: Uint8Array;
}

export interface CommentSyncUpdate {
  readonly type: "comment_sync_update";
  readonly docId: DocId;
  readonly update: Uint8Array;
}

export interface CommentUpdate {
  readonly type: "comment_update";
  readonly docId: DocId;
  readonly update: Uint8Array;
}

/** Union of all comment stream events */
export type CommentStreamEvent = CommentSyncStateVector | CommentSyncUpdate | CommentUpdate;
