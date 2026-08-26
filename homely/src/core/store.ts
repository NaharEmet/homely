import { createEmptyHome, type NormalizedHomeState } from './home'
import { followTopCamera } from './top-camera-follower'

/**
 * Pure home state store. Zero platform imports; all mutation goes through
 * apply() so the automation layer and the UI share one truth.
 *
 * Undo/redo is snapshot-based: every undoable mutation clones the whole home.
 * Depth-capped (SH3D keeps full history; 100 is ample for equivalence runs).
 *
 * The SH3D top-camera follower runs after every content change (apply/undo/
 * redo) — HomeController3D$TopCameraState parity. It skips camera-only
 * mutations, so explicit moves are never fought; writes are non-undoable
 * (camera placement is not an undoable edit in SH3D either).
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
    const previous = this.home
    const draft = structuredClone(previous)
    mutate(draft)
    this.undoStack.push(previous)
    if (this.undoStack.length > HomeStore.MAX_UNDO_DEPTH) this.undoStack.shift()
    this.redoStack = []
    this.home = draft
    followTopCamera(this.home, previous)
  }

  undo(): boolean {
    const previous = this.undoStack.pop()
    if (!previous) return false
    const current = this.home
    this.redoStack.push(structuredClone(current))
    this.home = previous
    followTopCamera(this.home, current)
    return true
  }

  redo(): boolean {
    const next = this.redoStack.pop()
    if (!next) return false
    const current = this.home
    this.undoStack.push(structuredClone(current))
    this.home = next
    followTopCamera(this.home, current)
    return true
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Mutates view-ish state (e.g. activeTool) WITHOUT recording an undo step —
   * tool switches are not document edits (SH3D mode changes are not undoable).
   * Deliberately does NOT run the top-camera follower (not a content change).
   */
  patchNonUndoable(mutate: (draft: NormalizedHomeState) => void): void {
    mutate(this.home)
  }

  /** Opaque, creation-ordered ids; harness matches by ledger order, not format. */
  generateId(prefix: string): string {
    return `${prefix}-${this.idCounter++}`
  }

  /** new_home semantics: reset to empty AND clear undo/redo + id counter.
   * SH3D NEW_HOME installs a brand-new default top camera — no follower run
   * (createEmptyHome already carries it); orbiting would wrongly preserve the
   * old distance. */
  resetToEmpty(): void {
    this.home = createEmptyHome()
    this.undoStack = []
    this.redoStack = []
    this.idCounter = 1
  }
}
