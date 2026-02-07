import type { DrawingId, ElementId } from "./ids.js";

/** A single drawing element (Excalidraw-compatible) */
export interface DrawingElement {
  readonly id: ElementId;
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly [key: string]: unknown;
}

/** Partial app state for the drawing scene */
export interface DrawingAppState {
  readonly viewBackgroundColor?: string;
  readonly [key: string]: unknown;
}

/** Binary file references for embedded images */
export interface DrawingFiles {
  readonly [fileId: string]: {
    readonly mimeType: string;
    readonly dataURL: string;
  };
}

/** A complete drawing scene snapshot (Excalidraw-compatible) */
export interface DrawingScene {
  readonly drawingId: DrawingId;
  readonly elements: readonly DrawingElement[];
  readonly appState: DrawingAppState;
  readonly files: DrawingFiles;
}
