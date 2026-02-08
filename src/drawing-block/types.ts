// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

/**
 * Core drawing type definitions.
 * These types are self-contained within drawing-block so it can be
 * used as a standalone package.
 */

// ---------------------------------------------------------------------------
// Branded type utility (duplicated here so drawing-block has zero deps)
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ---------------------------------------------------------------------------
// Drawing-specific branded IDs
// ---------------------------------------------------------------------------

export type DrawingId = Brand<string, "DrawingId">;
export type ElementId = Brand<string, "ElementId">;
export type HistoryGroupId = Brand<string, "HistoryGroupId">;

export const createDrawingId = (id: string): DrawingId => id as DrawingId;
export const createElementId = (id: string): ElementId => id as ElementId;
export const createHistoryGroupId = (id: string): HistoryGroupId =>
  id as HistoryGroupId;

// ---------------------------------------------------------------------------
// Drawing element & scene types (Excalidraw-compatible)
// ---------------------------------------------------------------------------

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
