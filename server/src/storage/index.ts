export interface StorageAdapter {
  save(file: File, filename: string): Promise<string>;
  delete(path: string): Promise<void>;
  publicUrl(path: string): string;
}
