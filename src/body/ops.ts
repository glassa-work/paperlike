// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type { DocId, ActorId, SessionId, LeaseId, OpId, BlockId, LaneId } from "../types/ids.js";
import type { Block, SectionLayout } from "../types/blocks.js";

/** Lease fields required for single-writer body operations */
export interface LeaseFields {
  readonly docId: DocId;
  readonly actorId: ActorId;
  readonly sessionId: SessionId;
  readonly leaseId: LeaseId;
  readonly baseVersion: number;
  readonly opId: OpId;
}

/** Insert a new block at a position */
export interface InsertBlockOp extends LeaseFields {
  readonly type: "insert_block";
  readonly block: Block;
  readonly afterBlockId: BlockId | null;
}

/** Update an existing block's content */
export interface UpdateBlockOp extends LeaseFields {
  readonly type: "update_block";
  readonly blockId: BlockId;
  readonly patch: Partial<Block>;
}

/** Delete a block */
export interface DeleteBlockOp extends LeaseFields {
  readonly type: "delete_block";
  readonly blockId: BlockId;
}

/** Move a block to a new position */
export interface MoveBlockOp extends LeaseFields {
  readonly type: "move_block";
  readonly blockId: BlockId;
  readonly afterBlockId: BlockId | null;
}

/** Split a section into lanes */
export interface SplitSectionOp extends LeaseFields {
  readonly type: "split_section";
  readonly blockId: BlockId;
  readonly lanes: readonly LaneId[];
}

/** Change section layout */
export interface SetSectionLayoutOp extends LeaseFields {
  readonly type: "set_section_layout";
  readonly blockId: BlockId;
  readonly layout: SectionLayout;
}

/** Union of all body stream operations */
export type BodyOp =
  | InsertBlockOp
  | UpdateBlockOp
  | DeleteBlockOp
  | MoveBlockOp
  | SplitSectionOp
  | SetSectionLayoutOp;
