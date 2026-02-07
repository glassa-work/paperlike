import { describe, it, expect } from "vitest";
import type { ParagraphBlock, SectionBlock } from "../types/blocks.js";
import type { InsertBlockOp, DeleteBlockOp, UpdateBlockOp, MoveBlockOp } from "./ops.js";
import {
  findBlockIndex,
  insertBlock,
  updateBlock,
  deleteBlock,
  moveBlock,
  applyBodyOp,
} from "./apply.js";
import {
  createBlockId,
  createDocId,
  createActorId,
  createSessionId,
  createLeaseId,
  createOpId,
  createLaneId,
} from "../types/ids.js";
import type { SectionLayout } from "../types/blocks.js";

const makeLeaseFields = () => ({
  docId: createDocId("doc-1"),
  actorId: createActorId("actor-1"),
  sessionId: createSessionId("sess-1"),
  leaseId: createLeaseId("lease-1"),
  baseVersion: 1,
  opId: createOpId("op-1"),
});

const blockA: ParagraphBlock = { id: createBlockId("a"), type: "paragraph", text: "Hello" };
const blockB: ParagraphBlock = { id: createBlockId("b"), type: "paragraph", text: "World" };
const blockC: ParagraphBlock = { id: createBlockId("c"), type: "paragraph", text: "!" };

describe("findBlockIndex", () => {
  it("returns the index of an existing block", () => {
    expect(findBlockIndex([blockA, blockB], createBlockId("b"))).toBe(1);
  });

  it("returns -1 for a non-existent block", () => {
    expect(findBlockIndex([blockA], createBlockId("z"))).toBe(-1);
  });
});

describe("insertBlock", () => {
  it("inserts at the beginning when afterBlockId is null", () => {
    const result = insertBlock([blockA], blockB, null);
    expect(result.map((b) => b.id)).toEqual(["b", "a"]);
  });

  it("inserts after the specified block", () => {
    const result = insertBlock([blockA, blockC], blockB, createBlockId("a"));
    expect(result.map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("appends to the end if afterBlockId not found", () => {
    const result = insertBlock([blockA], blockB, createBlockId("nonexistent"));
    expect(result.map((b) => b.id)).toEqual(["a", "b"]);
  });
});

describe("updateBlock", () => {
  it("updates the matching block with a patch", () => {
    const result = updateBlock([blockA, blockB], createBlockId("a"), { text: "Updated" });
    const updated = result[0] as ParagraphBlock;
    expect(updated.text).toBe("Updated");
    expect(updated.id).toBe("a");
    expect(updated.type).toBe("paragraph");
  });

  it("does not modify non-matching blocks", () => {
    const result = updateBlock([blockA, blockB], createBlockId("a"), { text: "Updated" });
    expect((result[1] as ParagraphBlock).text).toBe("World");
  });
});

describe("deleteBlock", () => {
  it("removes the block with the given ID", () => {
    const result = deleteBlock([blockA, blockB, blockC], createBlockId("b"));
    expect(result.map((b) => b.id)).toEqual(["a", "c"]);
  });

  it("returns unchanged list if block not found", () => {
    const result = deleteBlock([blockA], createBlockId("z"));
    expect(result.map((b) => b.id)).toEqual(["a"]);
  });
});

describe("moveBlock", () => {
  it("moves a block to the beginning", () => {
    const result = moveBlock([blockA, blockB, blockC], createBlockId("c"), null);
    expect(result.map((b) => b.id)).toEqual(["c", "a", "b"]);
  });

  it("moves a block after another block", () => {
    const result = moveBlock([blockA, blockB, blockC], createBlockId("c"), createBlockId("a"));
    expect(result.map((b) => b.id)).toEqual(["a", "c", "b"]);
  });

  it("returns unchanged list if block not found", () => {
    const result = moveBlock([blockA, blockB], createBlockId("z"), null);
    expect(result.map((b) => b.id)).toEqual(["a", "b"]);
  });
});

describe("applyBodyOp", () => {
  it("applies insert_block operation", () => {
    const op: InsertBlockOp = {
      ...makeLeaseFields(),
      type: "insert_block",
      block: blockB,
      afterBlockId: createBlockId("a"),
    };
    const result = applyBodyOp([blockA], op);
    expect(result.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("applies delete_block operation", () => {
    const op: DeleteBlockOp = {
      ...makeLeaseFields(),
      type: "delete_block",
      blockId: createBlockId("a"),
    };
    const result = applyBodyOp([blockA, blockB], op);
    expect(result.map((b) => b.id)).toEqual(["b"]);
  });

  it("applies update_block operation", () => {
    const op: UpdateBlockOp = {
      ...makeLeaseFields(),
      type: "update_block",
      blockId: createBlockId("a"),
      patch: { text: "New" },
    };
    const result = applyBodyOp([blockA], op);
    expect((result[0] as ParagraphBlock).text).toBe("New");
  });

  it("applies move_block operation", () => {
    const op: MoveBlockOp = {
      ...makeLeaseFields(),
      type: "move_block",
      blockId: createBlockId("b"),
      afterBlockId: null,
    };
    const result = applyBodyOp([blockA, blockB], op);
    expect(result.map((b) => b.id)).toEqual(["b", "a"]);
  });

  it("applies set_section_layout operation", () => {
    const section: SectionBlock = {
      id: createBlockId("sec-1"),
      type: "section",
      layout: { kind: "columns", lanes: [createLaneId("a")] },
      childrenByLane: { a: [createBlockId("b1")] },
    };
    const newLayout: SectionLayout = {
      kind: "columns",
      lanes: [createLaneId("a"), createLaneId("b")],
    };
    const op = {
      ...makeLeaseFields(),
      type: "set_section_layout" as const,
      blockId: createBlockId("sec-1"),
      layout: newLayout,
    };
    const result = applyBodyOp([section], op);
    expect((result[0] as SectionBlock).layout.lanes).toEqual(["a", "b"]);
  });
});
