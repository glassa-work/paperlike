import { describe, it, expect } from "vitest";
import {
  createCommentsDoc,
  addComment,
  getComments,
  encodeState,
  encodeStateVector,
  applyUpdate,
  generateCommentId,
} from "./crdt.js";
import { createCommentId, createDocId, createActorId, createBlockId } from "../types/ids.js";
import type { CommentAnchor } from "./types.js";

const anchor: CommentAnchor = { kind: "block", blockId: createBlockId("b1") };

describe("createCommentsDoc", () => {
  it("creates a Yjs doc", () => {
    const doc = createCommentsDoc();
    expect(doc).toBeDefined();
  });
});

describe("addComment / getComments", () => {
  it("adds and retrieves a comment", () => {
    const doc = createCommentsDoc();
    addComment(
      doc,
      createCommentId("c1"),
      createDocId("doc-1"),
      createActorId("author-1"),
      anchor,
      "Hello!",
      1000,
    );
    const comments = getComments(doc);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.text).toBe("Hello!");
    expect(comments[0]?.resolved).toBe(false);
  });

  it("adds multiple comments", () => {
    const doc = createCommentsDoc();
    addComment(doc, createCommentId("c1"), createDocId("d"), createActorId("a"), anchor, "A", 1);
    addComment(doc, createCommentId("c2"), createDocId("d"), createActorId("a"), anchor, "B", 2);
    expect(getComments(doc)).toHaveLength(2);
  });
});

describe("CRDT sync (encode/apply)", () => {
  it("syncs state between two docs", () => {
    const doc1 = createCommentsDoc();
    addComment(
      doc1,
      createCommentId("c1"),
      createDocId("doc-1"),
      createActorId("a1"),
      anchor,
      "From doc1",
      1000,
    );

    const doc2 = createCommentsDoc();
    const update = encodeState(doc1);
    applyUpdate(doc2, update);

    const comments = getComments(doc2);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.text).toBe("From doc1");
  });

  it("merges concurrent edits from two docs", () => {
    const doc1 = createCommentsDoc();
    const doc2 = createCommentsDoc();

    addComment(
      doc1,
      createCommentId("c1"),
      createDocId("d"),
      createActorId("a1"),
      anchor,
      "Comment 1",
      1,
    );
    addComment(
      doc2,
      createCommentId("c2"),
      createDocId("d"),
      createActorId("a2"),
      anchor,
      "Comment 2",
      2,
    );

    const update1 = encodeState(doc1);
    const update2 = encodeState(doc2);

    applyUpdate(doc1, update2);
    applyUpdate(doc2, update1);

    expect(getComments(doc1)).toHaveLength(2);
    expect(getComments(doc2)).toHaveLength(2);
  });

  it("encodes a state vector", () => {
    const doc = createCommentsDoc();
    const sv = encodeStateVector(doc);
    expect(sv).toBeInstanceOf(Uint8Array);
  });
});

describe("generateCommentId", () => {
  it("generates unique IDs", () => {
    const id1 = generateCommentId();
    const id2 = generateCommentId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith("comment-")).toBe(true);
  });
});
