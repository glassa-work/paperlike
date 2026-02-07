import { describe, it, expect } from "vitest";
import {
  createDocId,
  createBlockId,
  createDrawingId,
  createLeaseId,
  createActorId,
  createSessionId,
  createOpId,
  createLaneId,
  createCommentId,
  createElementId,
  createHistoryGroupId,
} from "./ids.js";

describe("branded ID factories", () => {
  it("creates a DocId from a string", () => {
    const id = createDocId("doc-1");
    expect(id).toBe("doc-1");
  });

  it("creates a BlockId from a string", () => {
    const id = createBlockId("block-1");
    expect(id).toBe("block-1");
  });

  it("creates a DrawingId from a string", () => {
    const id = createDrawingId("draw-1");
    expect(id).toBe("draw-1");
  });

  it("creates a LeaseId from a string", () => {
    const id = createLeaseId("lease-1");
    expect(id).toBe("lease-1");
  });

  it("creates an ActorId from a string", () => {
    const id = createActorId("actor-1");
    expect(id).toBe("actor-1");
  });

  it("creates a SessionId from a string", () => {
    const id = createSessionId("session-1");
    expect(id).toBe("session-1");
  });

  it("creates an OpId from a string", () => {
    const id = createOpId("op-1");
    expect(id).toBe("op-1");
  });

  it("creates a LaneId from a string", () => {
    const id = createLaneId("lane-1");
    expect(id).toBe("lane-1");
  });

  it("creates a CommentId from a string", () => {
    const id = createCommentId("comment-1");
    expect(id).toBe("comment-1");
  });

  it("creates an ElementId from a string", () => {
    const id = createElementId("elem-1");
    expect(id).toBe("elem-1");
  });

  it("creates a HistoryGroupId from a string", () => {
    const id = createHistoryGroupId("hg-1");
    expect(id).toBe("hg-1");
  });
});
