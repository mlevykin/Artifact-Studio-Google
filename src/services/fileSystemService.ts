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
  if (!name) return 'unnamed';
  // Remove illegal filesystem characters: \ / : * ? " < > |
  // Also remove control characters and other problematic symbols
  // eslint-disable-next-line no-control-regex
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '_')
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .trim()
    .slice(0, 255) || 'unnamed'; // Max filename length, fallback if empty
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

    if (key === 'folders') {
      const fileHandle = await metaDir.getFileHandle(`folders.json`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
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

    if (key === 'folders') {
      try {
        const fileHandle = await metaDir.getFileHandle(`folders.json`);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
      } catch (e) {
        return null;
      }
    }

    const fileHandle = await metaDir.getFileHandle(`${key}.json`);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

export async function saveArtifact(rootHandle: any, sessionId: string, artifact: any, folderName?: string | null) {
  try {
    const artifactsDir = await rootHandle.getDirectoryHandle('artifacts', { create: true });
    let sessionBaseDir = artifactsDir;
    
    if (folderName) {
      sessionBaseDir = await artifactsDir.getDirectoryHandle(sanitizeFilename(folderName), { create: true });
    }
    
    const sessionDir = await sessionBaseDir.getDirectoryHandle(sessionId, { create: true });
    
    // Skip system artifacts
    const isSystem = artifact.id === 'workspace-explorer' || 
                     artifact.id === 'streaming' || 
                     artifact.title.toLowerCase().includes('workspace explorer');
    if (isSystem) return;

    let targetDir = sessionDir;
    const title = artifact.title.trim().toLowerCase();
    const type = artifact.type.toLowerCase();
    const extension = (type === 'markdown' || type === 'text/markdown' || type === 'md') ? 'md' : type;
    let filename = `${sanitizeFilename(artifact.title)}.${extension}`;

    // Map technical artifacts to standard filenames
    if (title === 'glossary' || title.includes('глоссарий')) {
      filename = 'glossary.md';
    } else if (title === 'cumulative summary' || title === 'summary' || title.includes('сводка проекта')) {
      filename = 'summary.md';
    } else if (title === 'table of contents' || title === 'toc' || title.includes('оглавление') || title.includes('содержание')) {
      filename = 'manifest.md';
    } else if (title === 'final document' || title === 'assembled document' || title.includes('итоговый документ')) {
      filename = 'Final Document.md';
    } else if (title.includes('chapter') || title.includes('глава')) {
      targetDir = await sessionDir.getDirectoryHandle('chapters', { create: true });
      // Normalize chapter filename: "Chapter 1: Title" -> "chapter_01.md"
      const match = artifact.title.match(/(?:Chapter|Глава)\s*(\d+)/i);
      if (match) {
        const num = match[1].padStart(2, '0');
        filename = `chapter_${num}.md`;
      }
    }
    
    const fileHandle = await targetDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(artifact.content);
    await writable.close();
  } catch (err) {
    console.error(`Failed to save artifact ${artifact.id} to disk:`, err);
  }
}

export async function moveSessionArtifacts(rootHandle: any, sessionId: string, oldFolderName: string | null, newFolderName: string | null) {
  try {
    console.log(`FS: Moving session ${sessionId} from "${oldFolderName || 'root'}" to "${newFolderName || 'root'}"`);

    const artifactsDir = await rootHandle.getDirectoryHandle('artifacts', { create: true });
    
    let oldBaseDir = artifactsDir;
    if (oldFolderName) {
      try {
        oldBaseDir = await artifactsDir.getDirectoryHandle(sanitizeFilename(oldFolderName));
      } catch (e) {
        console.warn(`FS: Old folder "${oldFolderName}" not found, skipping move for session ${sessionId}`);
        return;
      }
    }

    let sessionDir;
    try {
      sessionDir = await oldBaseDir.getDirectoryHandle(sessionId);
    } catch (e) {
      console.warn(`FS: Session directory ${sessionId} not found in "${oldFolderName || 'root'}", skipping move`);
      return;
    }

    let newBaseDir = artifactsDir;
    if (newFolderName) {
      newBaseDir = await artifactsDir.getDirectoryHandle(sanitizeFilename(newFolderName), { create: true });
    }

    // Move the session directory
    async function copyDir(src: any, dest: any) {
      // @ts-ignore
      for await (const entry of src.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const newFile = await dest.getFileHandle(entry.name, { create: true });
          const writable = await newFile.createWritable();
          await writable.write(await file.arrayBuffer());
          await writable.close();
        } else if (entry.kind === 'directory') {
          const newDir = await dest.getDirectoryHandle(entry.name, { create: true });
          await copyDir(entry, newDir);
        }
      }
    }

    const newSessionDir = await newBaseDir.getDirectoryHandle(sessionId, { create: true });
    await copyDir(sessionDir, newSessionDir);
    await oldBaseDir.removeEntry(sessionId, { recursive: true });
    console.log(`FS: Successfully moved session ${sessionId} to "${newFolderName || 'root'}"`);

    // If oldBaseDir is now empty and it's not the root artifacts dir, remove it
    if (oldFolderName) {
      try {
        let isEmpty = true;
        // @ts-ignore
        for await (const _ of oldBaseDir.values()) {
          isEmpty = false;
          break;
        }
        if (isEmpty) {
          console.log(`FS: Removing now-empty folder "${oldFolderName}"`);
          await artifactsDir.removeEntry(sanitizeFilename(oldFolderName));
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

  } catch (err) {
    console.error(`Failed to move session artifacts for ${sessionId}:`, err);
  }
}

export async function deleteSessionFolder(rootHandle: any, sessionId: string, folderName?: string | null) {
  try {
    const artifactsDir = await rootHandle.getDirectoryHandle('artifacts', { create: true });
    let baseDir = artifactsDir;
    if (folderName) {
      try {
        baseDir = await artifactsDir.getDirectoryHandle(sanitizeFilename(folderName));
      } catch (e) {
        return;
      }
    }
    try {
      await baseDir.removeEntry(sessionId, { recursive: true });
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

      // Create subdirectories if they don't exist
      for (const part of pathParts) {
        if (!part || part === '.' || part === '..') continue;
        const sanitizedPart = sanitizeFilename(part);
        if (!sanitizedPart || sanitizedPart === '.' || sanitizedPart === '..') continue;
        currentDir = await currentDir.getDirectoryHandle(sanitizedPart, { create: true });
      }

      // Write the file
      const sanitizedFileName = sanitizeFilename(fileName);
      if (!sanitizedFileName) {
        console.warn(`FS: Skipping file with empty sanitized name: ${file.path}`);
        continue;
      }
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
