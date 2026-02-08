// NOTE: If this file changes, update README.md and ARCHITECTURE.md accordingly.

/** Generic typed event emitter with unsubscribe support. */
export class Emitter<T> {
  private listeners: Array<(value: T) => void> = [];

  /** Subscribe to events. Returns an unsubscribe function. */
  on(cb: (value: T) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  /** Emit a value to all listeners. */
  emit(value: T): void {
    for (const cb of this.listeners) cb(value);
  }
}
