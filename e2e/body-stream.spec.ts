import { test, expect } from "@playwright/test";
import {
  createBlockId,
  createDocId,
  createActorId,
  createSessionId,
  createLeaseId,
  createOpId,
  createDrawingId,
  createElementId,
  createHistoryGroupId,
  createLaneId,
  createCommentId,
} from "../src/types/ids.js";
import {
  insertBlock,
  updateBlock,
  deleteBlock,
  moveBlock,
  applyBodyOp,
} from "../src/body/apply.js";
import { isLeaseValid, isLeaseOwner, validateLease } from "../src/body/lease.js";
import type { Lease } from "../src/body/lease.js";
import type {
  ParagraphBlock,
  HeadingBlock,
  ListBlock,
  DrawingRefBlock,
  SpacerBlock,
  SectionBlock,
} from "../src/types/blocks.js";
import type { DocumentSnapshot } from "../src/types/document.js";
import type { InsertBlockOp, UpdateBlockOp, DeleteBlockOp, MoveBlockOp } from "../src/body/ops.js";

const makeLeaseFields = () => ({
  docId: createDocId("doc-e2e"),
  actorId: createActorId("actor-e2e"),
  sessionId: createSessionId("sess-e2e"),
  leaseId: createLeaseId("lease-e2e"),
  baseVersion: 0,
  opId: createOpId("op-0"),
});

test.describe("Body Stream E2E: full document editing lifecycle", () => {
  test("create document → add blocks → edit → reorder → delete → verify final state", () => {
    // Step 1: Start with an empty document
    let blocks: readonly ParagraphBlock[] = [];

    // Step 2: Insert a heading-like paragraph
    const heading: ParagraphBlock = {
      id: createBlockId("h1"),
      type: "paragraph",
      text: "Welcome to Paperlike",
    };
    blocks = insertBlock(blocks, heading, null) as ParagraphBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.text).toBe("Welcome to Paperlike");

    // Step 3: Insert more blocks
    const para1: ParagraphBlock = {
      id: createBlockId("p1"),
      type: "paragraph",
      text: "First paragraph",
    };
    const para2: ParagraphBlock = {
      id: createBlockId("p2"),
      type: "paragraph",
      text: "Second paragraph",
    };
    blocks = insertBlock(blocks, para1, createBlockId("h1")) as ParagraphBlock[];
    blocks = insertBlock(blocks, para2, createBlockId("p1")) as ParagraphBlock[];
    expect(blocks).toHaveLength(3);
    expect(blocks.map((b) => b.id)).toEqual(["h1", "p1", "p2"]);

    // Step 4: Update a block
    blocks = updateBlock(blocks, createBlockId("p1"), {
      text: "Updated first paragraph",
    }) as ParagraphBlock[];
    expect((blocks[1] as ParagraphBlock).text).toBe("Updated first paragraph");

    // Step 5: Move p2 to the top
    blocks = moveBlock(blocks, createBlockId("p2"), null) as ParagraphBlock[];
    expect(blocks.map((b) => b.id)).toEqual(["p2", "h1", "p1"]);

    // Step 6: Delete h1
    blocks = deleteBlock(blocks, createBlockId("h1")) as ParagraphBlock[];
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.id)).toEqual(["p2", "p1"]);

    // Step 7: Verify final state integrity
    expect((blocks[0] as ParagraphBlock).text).toBe("Second paragraph");
    expect((blocks[1] as ParagraphBlock).text).toBe("Updated first paragraph");
  });

  test("apply body ops through the applyBodyOp dispatcher", () => {
    let blocks: readonly ParagraphBlock[] = [];
    const lease = makeLeaseFields();

    // Insert via op
    const insertOp: InsertBlockOp = {
      ...lease,
      opId: createOpId("op-1"),
      baseVersion: 0,
      type: "insert_block",
      block: { id: createBlockId("b1"), type: "paragraph", text: "Block 1" } as ParagraphBlock,
      afterBlockId: null,
    };
    blocks = applyBodyOp(blocks, insertOp) as ParagraphBlock[];
    expect(blocks).toHaveLength(1);

    // Insert second block after first
    const insertOp2: InsertBlockOp = {
      ...lease,
      opId: createOpId("op-2"),
      baseVersion: 1,
      type: "insert_block",
      block: { id: createBlockId("b2"), type: "paragraph", text: "Block 2" } as ParagraphBlock,
      afterBlockId: createBlockId("b1"),
    };
    blocks = applyBodyOp(blocks, insertOp2) as ParagraphBlock[];
    expect(blocks).toHaveLength(2);

    // Update via op
    const updateOp: UpdateBlockOp = {
      ...lease,
      opId: createOpId("op-3"),
      baseVersion: 2,
      type: "update_block",
      blockId: createBlockId("b1"),
      patch: { text: "Updated Block 1" },
    };
    blocks = applyBodyOp(blocks, updateOp) as ParagraphBlock[];
    expect((blocks[0] as ParagraphBlock).text).toBe("Updated Block 1");

    // Move via op
    const moveOp: MoveBlockOp = {
      ...lease,
      opId: createOpId("op-4"),
      baseVersion: 3,
      type: "move_block",
      blockId: createBlockId("b2"),
      afterBlockId: null,
    };
    blocks = applyBodyOp(blocks, moveOp) as ParagraphBlock[];
    expect(blocks.map((b) => b.id)).toEqual(["b2", "b1"]);

    // Delete via op
    const deleteOp: DeleteBlockOp = {
      ...lease,
      opId: createOpId("op-5"),
      baseVersion: 4,
      type: "delete_block",
      blockId: createBlockId("b2"),
    };
    blocks = applyBodyOp(blocks, deleteOp) as ParagraphBlock[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.id).toBe("b1");
  });

  test("lease validation guards body operations", () => {
    const now = 1000;
    const lease: Lease = {
      docId: createDocId("doc-1"),
      actorId: createActorId("actor-1"),
      sessionId: createSessionId("sess-1"),
      leaseId: createLeaseId("lease-1"),
      acquiredAt: 500,
      expiresAt: 2000,
    };

    // Valid lease
    expect(isLeaseValid(lease, now)).toBe(true);
    expect(isLeaseOwner(lease, createActorId("actor-1"), createSessionId("sess-1"))).toBe(true);
    expect(
      validateLease(
        lease,
        createActorId("actor-1"),
        createSessionId("sess-1"),
        createLeaseId("lease-1"),
        now,
      ),
    ).toBe(true);

    // Expired lease
    expect(isLeaseValid(lease, 3000)).toBe(false);
    expect(
      validateLease(
        lease,
        createActorId("actor-1"),
        createSessionId("sess-1"),
        createLeaseId("lease-1"),
        3000,
      ),
    ).toBe(false);

    // Wrong actor
    expect(
      validateLease(
        lease,
        createActorId("actor-2"),
        createSessionId("sess-1"),
        createLeaseId("lease-1"),
        now,
      ),
    ).toBe(false);

    // Wrong lease ID (contention scenario)
    expect(
      validateLease(
        lease,
        createActorId("actor-1"),
        createSessionId("sess-1"),
        createLeaseId("lease-other"),
        now,
      ),
    ).toBe(false);
  });

  test("recursive column sections with nested lanes", () => {
    const innerSection: SectionBlock = {
      id: createBlockId("inner-sec"),
      type: "section",
      layout: { kind: "columns", lanes: [createLaneId("innerA"), createLaneId("innerB")] },
      childrenByLane: {
        innerA: [createBlockId("nested-p1")],
        innerB: [createBlockId("nested-p2")],
      },
    };

    const outerSection: SectionBlock = {
      id: createBlockId("outer-sec"),
      type: "section",
      layout: { kind: "columns", lanes: [createLaneId("left"), createLaneId("right")] },
      childrenByLane: {
        left: [createBlockId("intro")],
        right: [innerSection.id],
      },
    };

    let blocks = insertBlock([], outerSection, null);
    blocks = insertBlock(blocks, innerSection, createBlockId("outer-sec"));

    expect(blocks).toHaveLength(2);
    expect((blocks[0] as SectionBlock).layout.lanes).toEqual(["left", "right"]);
    expect((blocks[1] as SectionBlock).layout.lanes).toEqual(["innerA", "innerB"]);
    expect((blocks[1] as SectionBlock).childrenByLane["innerA"]).toEqual(["nested-p1"]);
  });
});
