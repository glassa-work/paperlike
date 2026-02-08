// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import * as Y from "yjs";
import type { Comment, CommentAnchor } from "./types.js";
import type { CommentId, DocId, ActorId } from "../types/ids.js";
import { createCommentId } from "../types/ids.js";

/** Create a new Yjs document for comments */
export const createCommentsDoc = (): Y.Doc => new Y.Doc();

/** Get the comments array from the Yjs doc */
export const getCommentsArray = (doc: Y.Doc): Y.Array<Record<string, unknown>> =>
  doc.getArray<Record<string, unknown>>("comments");

/** Add a comment to the CRDT doc */
export const addComment = (
  doc: Y.Doc,
  id: CommentId,
  docId: DocId,
  authorId: ActorId,
  anchor: CommentAnchor,
  text: string,
  createdAt: number,
): void => {
  const arr = getCommentsArray(doc);
  arr.push([
    {
      id,
      docId,
      authorId,
      anchor: anchor as unknown as Record<string, unknown>,
      text,
      createdAt,
      resolved: false,
    },
  ]);
};

/** Get all comments from the CRDT doc as plain objects */
export const getComments = (doc: Y.Doc): readonly Comment[] => {
  const arr = getCommentsArray(doc);
  return arr.toArray().map((item) => item as unknown as Comment);
};

/** Encode the CRDT state as a binary update */
export const encodeState = (doc: Y.Doc): Uint8Array => Y.encodeStateAsUpdate(doc);

/** Encode the state vector for sync */
export const encodeStateVector = (doc: Y.Doc): Uint8Array => Y.encodeStateVector(doc);

/** Apply a remote CRDT update */
export const applyUpdate = (doc: Y.Doc, update: Uint8Array): void => {
  Y.applyUpdate(doc, update);
};

/** Generate a unique comment ID */
export const generateCommentId = (): CommentId =>
  createCommentId(`comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
