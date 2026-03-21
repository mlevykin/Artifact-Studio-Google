import { get, set } from 'idb-keyval';

/**
 * Service to handle direct file system access using the File System Access API.
 */

const HANDLE_KEY = 'artifact-studio-workspace-handle';

export function isFileSystemApiSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

export async function getStoredDirectoryHandle(): Promise<any | null> {
  return await get(HANDLE_KEY);
}

export async function storeDirectoryHandle(handle: any) {
  await set(HANDLE_KEY, handle);
}

export async function selectLocalDirectory(): Promise<any | null> {
  if (!isFileSystemApiSupported()) {
    throw new Error('Ваш браузер не поддерживает File System Access API. Пожалуйста, используйте Chrome или Edge.');
  }
  
  try {
    // @ts-ignore
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite'
    });
    await storeDirectoryHandle(handle);
    return handle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    if ((error as Error).name === 'SecurityError') {
      throw new Error('Доступ к файловой системе заблокирован политикой безопасности (возможно, из-за запуска в iframe). Попробуйте открыть приложение в новой вкладке.');
    }
    console.error('Failed to select directory:', error);
    throw error;
  }
}

export async function checkPermission(handle: any, readWrite: boolean = true): Promise<boolean> {
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  
  try {
    // @ts-ignore
    return (await handle.queryPermission(options)) === 'granted';
  } catch (e) {
    return false;
  }
}

export async function requestPermission(handle: any, readWrite: boolean = true): Promise<boolean> {
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  
  try {
    // @ts-ignore
    return (await handle.requestPermission(options)) === 'granted';
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

// --- Application State Management on Disk ---

const METADATA_DIR = '.artifact-studio';

async function ensureMetadataDir(rootHandle: any) {
  return await rootHandle.getDirectoryHandle(METADATA_DIR, { create: true });
}

export async function saveAppState(rootHandle: any, key: string, data: any) {
  try {
    const metaDir = await ensureMetadataDir(rootHandle);
    const fileHandle = await metaDir.getFileHandle(`${key}.json`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (err) {
    console.error(`Failed to save state ${key} to disk:`, err);
  }
}

export async function loadAppState(rootHandle: any, key: string): Promise<any | null> {
  try {
    const metaDir = await ensureMetadataDir(rootHandle);
    const fileHandle = await metaDir.getFileHandle(`${key}.json`);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (err) {
    // File might not exist yet
    return null;
  }
}

export async function writeProjectToDirectory(
  directoryHandle: any,
  files: { path: string; content: string }[]
) {
  for (const file of files) {
    try {
      const pathParts = file.path.split('/');
      const fileName = pathParts.pop()!;
      let currentDir = directoryHandle;

      // Create subdirectories if they don't exist
      for (const part of pathParts) {
        if (!part || part === '.') continue;
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
      }

      // Write the file
      const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file.content);
      await writable.close();
    } catch (err) {
      console.error(`Failed to write file ${file.path}:`, err);
      throw err;
    }
  }
}
