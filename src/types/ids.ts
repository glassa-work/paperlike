// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

/**
 * Branded type utility for nominal typing.
 * Prevents accidental mixing of string IDs.
 */
declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type DocId = Brand<string, "DocId">;
export type BlockId = Brand<string, "BlockId">;
export type LeaseId = Brand<string, "LeaseId">;
export type ActorId = Brand<string, "ActorId">;
export type SessionId = Brand<string, "SessionId">;
export type OpId = Brand<string, "OpId">;
export type LaneId = Brand<string, "LaneId">;
export type CommentId = Brand<string, "CommentId">;

// Drawing-related IDs are canonical in drawing-block (self-contained module)
export type { DrawingId, ElementId, HistoryGroupId } from "../drawing-block/types.js";

/** Helper to create branded IDs from plain strings */
export const createDocId = (id: string): DocId => id as DocId;
export const createBlockId = (id: string): BlockId => id as BlockId;
export const createLeaseId = (id: string): LeaseId => id as LeaseId;
export const createActorId = (id: string): ActorId => id as ActorId;
export const createSessionId = (id: string): SessionId => id as SessionId;
export const createOpId = (id: string): OpId => id as OpId;
export const createLaneId = (id: string): LaneId => id as LaneId;
export const createCommentId = (id: string): CommentId => id as CommentId;

// Drawing-related ID factories are canonical in drawing-block
export { createDrawingId, createElementId, createHistoryGroupId } from "../drawing-block/types.js";
