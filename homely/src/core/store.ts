import { createEmptyHome, type NormalizedHomeState } from './home'

/**
 * Pure home state store. Zero platform imports; all mutation goes through
 * apply() so the automation layer and the UI share one truth.
 *
 * Undo/redo is snapshot-based: every undoable mutation clones the whole home.
 * Depth-capped (SH3D keeps full history; 100 is ample for equivalence runs).
 */
export class HomeStore {
  static readonly MAX_UNDO_DEPTH = 100

  private home: NormalizedHomeState = createEmptyHome()
  private undoStack: NormalizedHomeState[] = []
  private redoStack: NormalizedHomeState[] = []
  private idCounter = 1

  /** Deep copy with live capability flags stamped in (never stale). */
  getHome(): NormalizedHomeState {
    const clone = structuredClone(this.home)
    clone.capabilities = { canUndo: this.canUndo(), canRedo: this.canRedo() }
    return clone
  }

  /**
   * Run a mutation against a private draft of the current state and record it
   * as one undo step — only if the mutation completes without throwing, so a
   * failed op never touches history or state. Any divergent mutation clears
   * the redo stack.
   */
  apply(mutate: (draft: NormalizedHomeState) => void): void {
    const draft = structuredClone(this.home)
    mutate(draft)
    this.undoStack.push(this.home)
    if (this.undoStack.length > HomeStore.MAX_UNDO_DEPTH) this.undoStack.shift()
    this.redoStack = []
    this.home = draft
  }

  undo(): boolean {
    const previous = this.undoStack.pop()
    if (!previous) return false
    this.redoStack.push(structuredClone(this.home))
    this.home = previous
    return true
  }

  redo(): boolean {
    const next = this.redoStack.pop()
    if (!next) return false
    this.undoStack.push(structuredClone(this.home))
    this.home = next
    return true
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Opaque, creation-ordered ids; harness matches by ledger order, not format. */
  generateId(prefix: string): string {
    return `${prefix}-${this.idCounter++}`
  }

  /** new_home semantics: reset to empty AND clear undo/redo + id counter. */
  resetToEmpty(): void {
    this.home = createEmptyHome()
    this.undoStack = []
    this.redoStack = []
    this.idCounter = 1
  }
}
