// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type { DocId } from "./ids.js";
import type { Block } from "./blocks.js";

/** The canonical document body snapshot */
export interface DocumentSnapshot {
  readonly docId: DocId;
  readonly version: number;
  readonly blocks: readonly Block[];
}
