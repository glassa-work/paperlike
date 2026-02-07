import type { BlockId, DrawingId, LaneId } from "./ids.js";

/** Block types supported in the document body */
export type BlockType = "paragraph" | "heading" | "list" | "drawing_ref" | "section" | "spacer";

/** Base block fields shared by all block types */
export interface BaseBlock {
  readonly id: BlockId;
  readonly type: BlockType;
}

export interface ParagraphBlock extends BaseBlock {
  readonly type: "paragraph";
  readonly text: string;
}

export interface HeadingBlock extends BaseBlock {
  readonly type: "heading";
  readonly text: string;
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ListBlock extends BaseBlock {
  readonly type: "list";
  readonly items: readonly string[];
  readonly ordered: boolean;
}

export interface DrawingRefBlock extends BaseBlock {
  readonly type: "drawing_ref";
  readonly drawingId: DrawingId;
}

export interface SpacerBlock extends BaseBlock {
  readonly type: "spacer";
}

/** Layout definition for sections */
export interface ColumnsLayout {
  readonly kind: "columns";
  readonly lanes: readonly LaneId[];
}

export type SectionLayout = ColumnsLayout;

/** Section block with recursive column nesting */
export interface SectionBlock extends BaseBlock {
  readonly type: "section";
  readonly layout: SectionLayout;
  readonly childrenByLane: Readonly<Record<string, readonly BlockId[]>>;
}

/** Union of all block types */
export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | DrawingRefBlock
  | SpacerBlock
  | SectionBlock;
