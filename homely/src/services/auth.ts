/** Placeholder auth seam; replaced by real auth in a later ticket. */
export interface AuthAdapter {
  currentUser(): Promise<string | null>
}

export class NoopAuth implements AuthAdapter {
  async currentUser(): Promise<string | null> {
    return null
  }
}
