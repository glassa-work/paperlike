import { test, expect } from "@playwright/test";
import {
  createCommentsDoc,
  addComment,
  getComments,
  encodeState,
  encodeStateVector,
  applyUpdate,
  generateCommentId,
} from "../src/comments/crdt.js";
import {
  createCommentId,
  createDocId,
  createActorId,
  createBlockId,
  createDrawingId,
  createElementId,
} from "../src/types/ids.js";
import type { CommentAnchor } from "../src/comments/types.js";

test.describe("Comments CRDT E2E: multi-author offline concurrent editing", () => {
  test("full comment lifecycle: add → sync → concurrent edits → convergence", () => {
    // Device A: Create comments doc and add a comment
    const docA = createCommentsDoc();
    const blockAnchor: CommentAnchor = { kind: "block", blockId: createBlockId("para-1") };

    addComment(
      docA,
      createCommentId("c1"),
      createDocId("doc-1"),
      createActorId("alice"),
      blockAnchor,
      "This paragraph needs revision",
      1000,
    );

    expect(getComments(docA)).toHaveLength(1);

    // Device B: Start with empty doc, sync from A
    const docB = createCommentsDoc();
    const stateA = encodeState(docA);
    applyUpdate(docB, stateA);

    expect(getComments(docB)).toHaveLength(1);
    expect(getComments(docB)[0]?.text).toBe("This paragraph needs revision");

    // Simulate offline: both devices add comments independently
    addComment(
      docA,
      createCommentId("c2"),
      createDocId("doc-1"),
      createActorId("alice"),
      blockAnchor,
      "Also check the spelling here",
      2000,
    );

    const drawingAnchor: CommentAnchor = {
      kind: "drawing",
      drawingId: createDrawingId("draw-1"),
    };
    addComment(
      docB,
      createCommentId("c3"),
      createDocId("doc-1"),
      createActorId("bob"),
      drawingAnchor,
      "The diagram looks off",
      2500,
    );

    // Before sync: A has 2, B has 2
    expect(getComments(docA)).toHaveLength(2);
    expect(getComments(docB)).toHaveLength(2);

    // Sync both ways (reconnection)
    const updateA = encodeState(docA);
    const updateB = encodeState(docB);
    applyUpdate(docA, updateB);
    applyUpdate(docB, updateA);

    // After sync: both should have 3 comments
    const commentsA = getComments(docA);
    const commentsB = getComments(docB);
    expect(commentsA).toHaveLength(3);
    expect(commentsB).toHaveLength(3);

    // Verify convergence: same content on both sides
    const textsA = commentsA.map((c) => c.text).sort();
    const textsB = commentsB.map((c) => c.text).sort();
    expect(textsA).toEqual(textsB);
  });

  test("comment anchoring on different targets: block, drawing, element", () => {
    const doc = createCommentsDoc();
    const docId = createDocId("doc-1");
    const actorId = createActorId("user-1");

    // Block anchor
    const blockAnchor: CommentAnchor = { kind: "block", blockId: createBlockId("b1") };
    addComment(doc, createCommentId("c1"), docId, actorId, blockAnchor, "On block", 1);

    // Drawing anchor
    const drawingAnchor: CommentAnchor = {
      kind: "drawing",
      drawingId: createDrawingId("d1"),
    };
    addComment(doc, createCommentId("c2"), docId, actorId, drawingAnchor, "On drawing", 2);

    // Element anchor (specific drawing element)
    const elementAnchor: CommentAnchor = {
      kind: "element",
      drawingId: createDrawingId("d1"),
      elementId: createElementId("e1"),
    };
    addComment(doc, createCommentId("c3"), docId, actorId, elementAnchor, "On element", 3);

    const comments = getComments(doc);
    expect(comments).toHaveLength(3);
    expect(comments[0]?.anchor).toEqual(blockAnchor);
    expect(comments[1]?.anchor).toEqual(drawingAnchor);
    expect(comments[2]?.anchor).toEqual(elementAnchor);
  });

  test("state vector sync for incremental updates", () => {
    const docA = createCommentsDoc();
    const anchor: CommentAnchor = { kind: "block", blockId: createBlockId("b1") };

    addComment(
      docA,
      createCommentId("c1"),
      createDocId("d"),
      createActorId("a"),
      anchor,
      "Initial",
      1,
    );

    const sv = encodeStateVector(docA);
    expect(sv).toBeInstanceOf(Uint8Array);
    expect(sv.length).toBeGreaterThan(0);

    // Full state should also be encodable
    const fullState = encodeState(docA);
    expect(fullState).toBeInstanceOf(Uint8Array);
    expect(fullState.length).toBeGreaterThan(0);
  });

  test("generateCommentId produces unique prefixed IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateCommentId());
    }
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id.startsWith("comment-")).toBe(true);
    }
  });
});
