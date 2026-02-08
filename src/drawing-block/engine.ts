// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

import type { DrawingElement, DrawingAppState, DrawingFiles } from "./types.js";
import type { ElementId } from "./types.js";

// ---------------------------------------------------------------------------
// DrawingEngine — the swappable internal that owns element manipulation.
// Implement this interface to plug in Excalidraw, tldraw, or any canvas lib.
// Follows Interface Segregation: engine only handles element CRUD + selection.
// ---------------------------------------------------------------------------

/** Read-only snapshot of engine state at a point in time. */
export interface EngineSnapshot {
  readonly elements: readonly DrawingElement[];
  readonly appState: DrawingAppState;
  readonly files: DrawingFiles;
}

/** Minimal selection model exposed by the engine. */
export interface EngineSelection {
  readonly selectedIds: ReadonlySet<ElementId>;
}

/** Events emitted by an engine instance. */
export interface EngineEvents {
  /** Called when elements change (add / update / delete). */
  onElementsChange?: (elements: readonly DrawingElement[]) => void;
  /** Called when selection changes. */
  onSelectionChange?: (selection: EngineSelection) => void;
}

/**
 * DrawingEngine — the core abstraction that decouples drawing internals
 * from the rest of the system. Swap the implementation without touching
 * controller, history, or adapter logic (Dependency Inversion).
 */
export interface DrawingEngine {
  /** Return a frozen snapshot of the current engine state. */
  getSnapshot(): EngineSnapshot;

  /** Replace engine state wholesale (used on load / redo-rebuild). */
  loadSnapshot(snapshot: EngineSnapshot): void;

  /** Add a new element and return the created element (may have defaults applied). */
  addElement(element: DrawingElement): DrawingElement;

  /** Patch an existing element in-place and return the element before mutation. */
  updateElement(elementId: ElementId, patch: Partial<DrawingElement>): DrawingElement | undefined;

  /** Remove an element and return the removed element. */
  deleteElement(elementId: ElementId): DrawingElement | undefined;

  /** Update partial app state (background color, etc.). */
  setAppState(patch: Partial<DrawingAppState>): DrawingAppState;

  /** Upsert binary file entries (embedded images). */
  upsertFiles(files: DrawingFiles): void;

  /** Set which elements are selected (empty set = clear). */
  setSelection(ids: ReadonlySet<ElementId>): void;

  /** Subscribe to engine events. Returns an unsubscribe function. */
  subscribe(events: EngineEvents): () => void;
}
