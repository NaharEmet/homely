import { StorageUnavailableError, type StorageAdapter } from '../storage'

/**
 * Tauri filesystem adapter (stub). Real implementation wires the Tauri FS
 * plugin (Cargo dep + capability entry) in the persistence ticket.
 */
export class TauriFsStorage implements StorageAdapter {
  async readText(path: string): Promise<string> {
    throw new StorageUnavailableError(`tauri fs read not wired yet (${path})`)
  }

  async writeText(path: string, _contents: string): Promise<void> {
    throw new StorageUnavailableError(`tauri fs write not wired yet (${path})`)
  }
}
