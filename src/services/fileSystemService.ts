import { get, set, del } from 'idb-keyval';

/**
 * Service to handle direct file system access using the File System Access API.
 */

const HANDLE_KEY = 'artifact-studio-workspace-handle';
const METADATA_DIR = '.artifact-studio';

export function isFileSystemApiSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

export async function getStoredDirectoryHandle(): Promise<any | null> {
  return await get(HANDLE_KEY);
}

export async function storeDirectoryHandle(handle: any) {
  await set(HANDLE_KEY, handle);
}

export async function clearStoredDirectoryHandle() {
  await del(HANDLE_KEY);
}

export async function selectLocalDirectory(): Promise<any | null> {
  if (!isFileSystemApiSupported()) {
    throw new Error('Your browser doesn\'t support the File System Access API. Please use Chrome or Edge.');
  }
  
  try {
    // @ts-ignore
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite'
    });
    await storeDirectoryHandle(handle);
    // Ensure base directories exist
    await ensureBaseDirectories(handle);
    return handle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    if ((error as Error).name === 'SecurityError') {
      throw new Error('File system access is blocked by security policy (possibly due to running in an iframe). Try opening the app in a new tab.');
    }
    console.error('Failed to select directory:', error);
    throw error;
  }
}

async function ensureBaseDirectories(rootHandle: any) {
  const metaDir = await rootHandle.getDirectoryHandle(METADATA_DIR, { create: true });
  await metaDir.getDirectoryHandle('skills', { create: true });
  await metaDir.getDirectoryHandle('sessions', { create: true });
  await rootHandle.getDirectoryHandle('artifacts', { create: true });
}

export async function checkPermission(handle: any, readWrite: boolean = true): Promise<boolean> {
  const options: any = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  
  try {
    // @ts-ignore
    const status = await handle.queryPermission(options);
    if (status === 'granted') return true;
    return false;
  } catch (e: any) {
    console.warn('Permission check failed, handle might be invalid:', e);
    // If it's a NotFoundError or similar, the handle is definitely invalid
    if (e.name === 'NotFoundError' || e.message?.toLowerCase().includes('not found')) {
      const error = new Error('Workspace folder not found or inaccessible');
      error.name = 'NotFoundError';
      throw error;
    }
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

async function ensureMetadataDir(rootHandle: any) {
  return await rootHandle.getDirectoryHandle(METADATA_DIR, { create: true });
}

function sanitizeFilename(name: string): string {
  // Allow Cyrillic, spaces, dots, and common symbols, but remove illegal filesystem characters
  // Illegal: \ / : * ? " < > |
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

export async function saveAppState(rootHandle: any, key: string, data: any) {
  try {
    const metaDir = await ensureMetadataDir(rootHandle);
    
    if (key === 'skills') {
      const skillsDir = await metaDir.getDirectoryHandle('skills', { create: true });
      const skills = data as any[];
      const currentFilenames = new Set(skills.map(s => `${sanitizeFilename(s.name)}.skill.json`));
      
      // Delete old files
      // @ts-ignore
      for await (const entry of (skillsDir as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.skill.json') && !currentFilenames.has(entry.name)) {
          await skillsDir.removeEntry(entry.name);
        }
      }

      for (const skill of skills) {
        const filename = `${sanitizeFilename(skill.name)}.skill.json`;
        const fileHandle = await skillsDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(skill, null, 2));
        await writable.close();
      }
      return;
    }

    if (key === 'sessions') {
      const sessionsDir = await metaDir.getDirectoryHandle('sessions', { create: true });
      const sessions = data as any[];
      const currentIds = new Set(sessions.map(s => `${s.id}.json`));

      // Delete old files
      // @ts-ignore
      for await (const entry of (sessionsDir as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json') && !currentIds.has(entry.name)) {
          await sessionsDir.removeEntry(entry.name);
        }
      }

      for (const session of sessions) {
        const fileHandle = await sessionsDir.getFileHandle(`${session.id}.json`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(session, null, 2));
        await writable.close();
      }
      return;
    }

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
    
    if (key === 'skills') {
      const skillsDir = await metaDir.getDirectoryHandle('skills', { create: true });
      const skills: any[] = [];
      // @ts-ignore
      for await (const entry of (skillsDir as any).values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.skill.json') || entry.name.endsWith('.json'))) {
          const file = await entry.getFile();
          const content = await file.text();
          skills.push(JSON.parse(content));
        }
      }
      return skills.length > 0 ? skills : null;
    }

    if (key === 'sessions') {
      const sessionsDir = await metaDir.getDirectoryHandle('sessions', { create: true });
      const sessions: any[] = [];
      // @ts-ignore
      for await (const entry of (sessionsDir as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const file = await entry.getFile();
          const content = await file.text();
          sessions.push(JSON.parse(content));
        }
      }
      return sessions.length > 0 ? sessions.sort((a, b) => b.lastUpdated - a.lastUpdated) : null;
    }

    const fileHandle = await metaDir.getFileHandle(`${key}.json`);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

export async function saveArtifact(rootHandle: any, sessionId: string, artifact: any) {
  try {
    const artifactsDir = await rootHandle.getDirectoryHandle('artifacts', { create: true });
    const sessionDir = await artifactsDir.getDirectoryHandle(sessionId, { create: true });
    
    const filename = `${sanitizeFilename(artifact.title)}.${artifact.type === 'markdown' ? 'md' : artifact.type}`;
    
    const fileHandle = await sessionDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(artifact.content);
    await writable.close();
  } catch (err) {
    console.error(`Failed to save artifact ${artifact.id} to disk:`, err);
  }
}

export async function deleteSessionFolder(rootHandle: any, sessionId: string) {
  try {
    const artifactsDir = await rootHandle.getDirectoryHandle('artifacts', { create: true });
    try {
      await artifactsDir.removeEntry(sessionId, { recursive: true });
    } catch (e) {
      // Ignore if folder doesn't exist
    }
  } catch (err) {
    console.error(`Failed to delete session folder ${sessionId}:`, err);
  }
}
export async function getWorkspaceTree(handle: any): Promise<any> {
  const tree: any = {
    name: handle.name,
    kind: 'directory',
    path: '',
    children: []
  };

  async function scan(dirHandle: any, currentTree: any) {
    // @ts-ignore
    for await (const entry of (dirHandle as any).values()) {
      // Show .artifact-studio but hide other dot-files
      if (entry.name.startsWith('.') && entry.name !== METADATA_DIR) continue;
      
      const node: any = {
        name: entry.name,
        kind: entry.kind,
        path: currentTree.path ? `${currentTree.path}/${entry.name}` : entry.name
      };

      if (entry.kind === 'directory') {
        node.children = [];
        await scan(entry, node);
      }
      
      currentTree.children.push(node);
    }
    if (currentTree.children) {
      currentTree.children.sort((a: any, b: any) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
  }

  await scan(handle, tree);
  return tree;
}

export async function readFileFromDirectory(
  directoryHandle: any,
  path: string
): Promise<string> {
  try {
    const pathParts = path.split('/').filter(Boolean);
    const fileName = pathParts.pop()!;
    let currentDir = directoryHandle;

    for (const part of pathParts) {
      currentDir = await currentDir.getDirectoryHandle(part);
    }

    const fileHandle = await currentDir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err) {
    console.error(`Failed to read file ${path}:`, err);
    throw err;
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

      const sanitizeName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '_');

      // Create subdirectories if they don't exist
      for (const part of pathParts) {
        if (!part || part === '.') continue;
        const sanitizedPart = sanitizeName(part);
        currentDir = await currentDir.getDirectoryHandle(sanitizedPart, { create: true });
      }

      // Write the file
      const sanitizedFileName = sanitizeName(fileName);
      const fileHandle = await currentDir.getFileHandle(sanitizedFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file.content);
      await writable.close();
    } catch (err) {
      console.error(`Failed to write file ${file.path}:`, err);
      throw err;
    }
  }
}
