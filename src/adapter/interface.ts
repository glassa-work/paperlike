import type { DocId, DrawingId, ActorId, SessionId, LeaseId } from "../types/ids.js";
import type { DocumentSnapshot } from "../types/document.js";
import type { DrawingScene } from "../types/drawing.js";
import type { BodyOp } from "../body/ops.js";
import type { DrawingAction } from "../drawing/actions.js";
import type { CommentStreamEvent } from "../comments/types.js";
import type { Lease } from "../body/lease.js";
import type { DrawingHistoryState } from "../drawing/history.js";

/** Callback for receiving stream events */
export type StreamCallback<T> = (event: T) => void;
/** Unsubscribe function returned by subscribe methods */
export type Unsubscribe = () => void;

/** Snapshot operations the host must implement */
export interface SnapshotAdapter {
  /** Load the document body snapshot */
  loadBodySnapshot(docId: DocId): Promise<DocumentSnapshot | null>;
  /** Save/persist the document body snapshot */
  saveBodySnapshot(snapshot: DocumentSnapshot): Promise<void>;
  /** Load a drawing scene snapshot */
  loadDrawingSnapshot(drawingId: DrawingId): Promise<DrawingScene | null>;
  /** Save/persist a drawing scene snapshot */
  saveDrawingSnapshot(scene: DrawingScene): Promise<void>;
  /** Load drawing history state */
  loadDrawingHistoryState(drawingId: DrawingId): Promise<DrawingHistoryState | null>;
  /** Save drawing history state */
  saveDrawingHistoryState(drawingId: DrawingId, state: DrawingHistoryState): Promise<void>;
  /** Load comments CRDT state */
  loadCommentsState(docId: DocId): Promise<Uint8Array | null>;
  /** Save comments CRDT state */
  saveCommentsState(docId: DocId, state: Uint8Array): Promise<void>;
}

/** Stream (pub/sub) operations the host must implement */
export interface StreamAdapter {
  /** Publish a body operation */
  publishBodyOp(op: BodyOp): Promise<void>;
  /** Subscribe to body operations */
  subscribeBodyOps(docId: DocId, callback: StreamCallback<BodyOp>): Unsubscribe;

  /** Publish a drawing action */
  publishDrawingAction(action: DrawingAction): Promise<void>;
  /** Subscribe to drawing actions */
  subscribeDrawingActions(
    drawingId: DrawingId,
    callback: StreamCallback<DrawingAction>,
  ): Unsubscribe;

  /** Publish a comment stream event */
  publishCommentEvent(event: CommentStreamEvent): Promise<void>;
  /** Subscribe to comment stream events */
  subscribeCommentEvents(docId: DocId, callback: StreamCallback<CommentStreamEvent>): Unsubscribe;
}

/** Lease operations the host must implement */
export interface LeaseAdapter {
  /** Acquire a lease on the document body */
  acquireLease(docId: DocId, actorId: ActorId, sessionId: SessionId): Promise<Lease | null>;
  /** Renew an existing lease */
  renewLease(leaseId: LeaseId): Promise<Lease | null>;
  /** Release a lease */
  releaseLease(leaseId: LeaseId): Promise<void>;
  /** Get the current active lease */
  getActiveLease(docId: DocId): Promise<Lease | null>;
}

/** The complete adapter interface combining all sub-adapters */
export interface PaperlikeAdapter extends SnapshotAdapter, StreamAdapter, LeaseAdapter {}
