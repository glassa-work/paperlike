import type { DrawingElement, DrawingAppState, DrawingFiles } from "../types/drawing.js";
import type { ElementId } from "../types/ids.js";
import type { DrawingEngine, EngineSnapshot, EngineSelection, EngineEvents } from "./engine.js";

// ---------------------------------------------------------------------------
// DefaultDrawingEngine — a plain in-memory implementation of DrawingEngine.
// Excalidraw-compatible shapes stored as simple objects.  Swap this for a
// real Excalidraw wrapper, tldraw adapter, or Canvas2D engine.
// ---------------------------------------------------------------------------

/** Create mutable copies of readonly element arrays. */
const cloneElements = (els: readonly DrawingElement[]): DrawingElement[] =>
  els.map((e) => ({ ...e }));

/**
 * Default (reference) implementation of DrawingEngine.
 * Stores elements, appState, and files in plain JS objects.
 * Good for tests, SSR, and as a baseline before plugging in Excalidraw.
 */
export class DefaultDrawingEngine implements DrawingEngine {
  private elements: DrawingElement[] = [];
  private appState: DrawingAppState = {};
  private files: DrawingFiles = {};
  private selectedIds: Set<ElementId> = new Set();
  private listeners: EngineEvents[] = [];

  // -- snapshot ---------------------------------------------------------------

  getSnapshot(): EngineSnapshot {
    return {
      elements: Object.freeze(cloneElements(this.elements)),
      appState: { ...this.appState },
      files: { ...this.files },
    };
  }

  loadSnapshot(snapshot: EngineSnapshot): void {
    this.elements = cloneElements(snapshot.elements);
    this.appState = { ...snapshot.appState };
    this.files = { ...snapshot.files };
    this.emitElementsChange();
  }

  // -- element CRUD -----------------------------------------------------------

  addElement(element: DrawingElement): DrawingElement {
    const copy: DrawingElement = { ...element };
    this.elements.push(copy);
    this.emitElementsChange();
    return copy;
  }

  updateElement(elementId: ElementId, patch: Partial<DrawingElement>): DrawingElement | undefined {
    const idx = this.findIndex(elementId);
    if (idx === -1) return undefined;
    const before = { ...this.elements[idx]! };
    this.elements[idx] = { ...before, ...patch, id: before.id } as DrawingElement;
    this.emitElementsChange();
    return before;
  }

  deleteElement(elementId: ElementId): DrawingElement | undefined {
    const idx = this.findIndex(elementId);
    if (idx === -1) return undefined;
    const removed = this.elements.splice(idx, 1)[0]!;
    this.selectedIds.delete(elementId);
    this.emitElementsChange();
    return removed;
  }

  // -- app state & files ------------------------------------------------------

  setAppState(patch: Partial<DrawingAppState>): DrawingAppState {
    const prev = { ...this.appState };
    this.appState = { ...this.appState, ...patch };
    return prev;
  }

  upsertFiles(files: DrawingFiles): void {
    this.files = { ...this.files, ...files };
  }

  // -- selection --------------------------------------------------------------

  setSelection(ids: ReadonlySet<ElementId>): void {
    this.selectedIds = new Set(ids);
    this.emitSelectionChange();
  }

  // -- events -----------------------------------------------------------------

  subscribe(events: EngineEvents): () => void {
    this.listeners.push(events);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== events);
    };
  }

  // -- private helpers --------------------------------------------------------

  private findIndex(id: ElementId): number {
    return this.elements.findIndex((e) => e.id === id);
  }

  private emitElementsChange(): void {
    const snapshot = Object.freeze(cloneElements(this.elements));
    for (const l of this.listeners) l.onElementsChange?.(snapshot);
  }

  private emitSelectionChange(): void {
    const sel: EngineSelection = { selectedIds: new Set(this.selectedIds) };
    for (const l of this.listeners) l.onSelectionChange?.(sel);
  }
}
