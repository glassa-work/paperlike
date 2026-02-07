import type { DocId, DrawingId } from "../types/ids.js";

/** Manifest for the .paperlike zip bundle */
export interface PaperlikeManifest {
  readonly version: "1.0";
  readonly docId: DocId;
  readonly createdAt: string;
  readonly drawingIds: readonly DrawingId[];
}
