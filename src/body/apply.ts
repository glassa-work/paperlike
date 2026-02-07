import type { Block } from "../types/blocks.js";
import type { BlockId } from "../types/ids.js";
import type { BodyOp } from "./ops.js";

/** Find the index of a block by its ID */
export const findBlockIndex = (blocks: readonly Block[], blockId: BlockId): number =>
  blocks.findIndex((b) => b.id === blockId);

/** Insert a block after the given block ID (null = beginning) */
export const insertBlock = (
  blocks: readonly Block[],
  block: Block,
  afterBlockId: BlockId | null,
): readonly Block[] => {
  if (afterBlockId === null) {
    return [block, ...blocks];
  }
  const index = findBlockIndex(blocks, afterBlockId);
  if (index === -1) {
    return [...blocks, block];
  }
  const result = [...blocks];
  result.splice(index + 1, 0, block);
  return result;
};

/** Update a block by applying a partial patch */
export const updateBlock = (
  blocks: readonly Block[],
  blockId: BlockId,
  patch: Partial<Block>,
): readonly Block[] =>
  blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch, id: b.id, type: b.type } as Block) : b));

/** Delete a block by ID */
export const deleteBlock = (blocks: readonly Block[], blockId: BlockId): readonly Block[] =>
  blocks.filter((b) => b.id !== blockId);

/** Move a block to a new position after the given block ID */
export const moveBlock = (
  blocks: readonly Block[],
  blockId: BlockId,
  afterBlockId: BlockId | null,
): readonly Block[] => {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return blocks;
  const without = blocks.filter((b) => b.id !== blockId);
  return insertBlock(without, block, afterBlockId);
};

/** Apply a single body operation to a block list */
export const applyBodyOp = (blocks: readonly Block[], op: BodyOp): readonly Block[] => {
  switch (op.type) {
    case "insert_block":
      return insertBlock(blocks, op.block, op.afterBlockId);
    case "update_block":
      return updateBlock(blocks, op.blockId, op.patch);
    case "delete_block":
      return deleteBlock(blocks, op.blockId);
    case "move_block":
      return moveBlock(blocks, op.blockId, op.afterBlockId);
    case "split_section":
      return blocks;
    case "set_section_layout":
      return updateBlock(blocks, op.blockId, { layout: op.layout } as Partial<Block>);
  }
};
