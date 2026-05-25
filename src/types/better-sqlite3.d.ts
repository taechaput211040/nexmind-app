declare module 'better-sqlite3' {
  interface RunResult { changes: number; lastInsertRowid: number | bigint }
  interface Statement<T = unknown[]> {
    run(...params: unknown[]): RunResult
    get(...params: unknown[]): T | undefined
    all(...params: unknown[]): T[]
    iterate(...params: unknown[]): IterableIterator<T>
  }
  interface Database {
    prepare<T = Record<string, unknown>>(sql: string): Statement<T>
    exec(sql: string): this
    pragma(pragma: string, options?: { simple?: boolean }): unknown
    close(): void
    transaction<F extends (...args: unknown[]) => unknown>(fn: F): F
  }
  interface DatabaseConstructor {
    new (filename: string, options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number; verbose?: (message?: unknown) => void }): Database
    (filename: string, options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number }): Database
  }
  const Database: DatabaseConstructor
  export = Database
}
