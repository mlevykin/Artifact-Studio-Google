/**
 * Service to handle direct file system access using the File System Access API.
 */

export async function selectLocalDirectory(): Promise<any | null> {
  try {
    // @ts-ignore - File System Access API might not be in types
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite'
    });
    return handle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    console.error('Failed to select directory:', error);
    throw error;
  }
}

export async function verifyPermission(handle: any, readWrite: boolean = true): Promise<boolean> {
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  
  // @ts-ignore
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  
  // @ts-ignore
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }
  
  return false;
}

export async function writeProjectToDirectory(
  directoryHandle: any,
  files: { path: string; content: string }[]
) {
  for (const file of files) {
    const pathParts = file.path.split('/');
    const fileName = pathParts.pop()!;
    let currentDir = directoryHandle;

    // Create subdirectories if they don't exist
    for (const part of pathParts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    // Write the file
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file.content);
    await writable.close();
  }
}
