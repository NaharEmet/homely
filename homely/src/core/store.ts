import { createEmptyHome, type NormalizedHomeState } from './home'

/**
 * Pure home state store. Zero platform imports; all mutation goes through
 * explicit commands so the automation layer and the UI share one truth.
 */
export class HomeStore {
  private home: NormalizedHomeState = createEmptyHome()
  private undoDepth = 0
  private redoDepth = 0

  getHome(): NormalizedHomeState {
    return structuredClone(this.home)
  }

  /** new_home semantics: reset to empty AND clear undo stack. */
  resetToEmpty(): void {
    this.home = createEmptyHome()
    this.undoDepth = 0
    this.redoDepth = 0
  }

  canUndo(): boolean {
    return this.undoDepth > 0
  }

  canRedo(): boolean {
    return this.redoDepth > 0
  }
}
