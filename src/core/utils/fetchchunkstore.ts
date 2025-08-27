/** @fileoverview
 * This file contains the code to fetch a model from a remote server and store it in the IndexedDB.
 *  Logic that can be used by any part of the app
 */
const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB

type ProgressInfo =
    | { type: 'download'; url: string; loaded: number; total?: number }
    | { type: 'chunkStored'; modelId: string; chunkIndex: number; bytesStored: number }
    | { type: 'complete'; modelId: string; totalBytes: number }
    | { type: 'error'; modelId: string; error: string }
    | { type: 'info'; modelId: string; msg: string; part?: string };

type ProgressCallback = (info: ProgressInfo) => void;

interface ModelMeta {
    modelId: string;
    chunkKeys: string[];
}

async function openDb(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
        const req = indexedDB.open('llm-models', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('models'))
                db.createObjectStore('models', { keyPath: 'modelId' });
            if (!db.objectStoreNames.contains('chunks'))
                db.createObjectStore('chunks'); // key = string, value = Blob or ArrayBuffer
        };
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}

async function getModelMeta(db: IDBDatabase, modelId: string): Promise<ModelMeta | undefined> {
    return new Promise((res, rej) => {
        const tx = db.transaction('models', 'readonly');
        const s = tx.objectStore('models');
        const req = s.get(modelId);
        req.onsuccess = () => res(req.result as ModelMeta | undefined);
        req.onerror = () => rej(req.error);
    });
}

async function putModelMeta(db: IDBDatabase, meta: ModelMeta): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction('models', 'readwrite');
        const s = tx.objectStore('models');
        const req = s.put(meta);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

async function storeChunk(db: IDBDatabase, key: string, chunk: ArrayBuffer): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction('chunks', 'readwrite');
        const s = tx.objectStore('chunks');
        const req = s.put(chunk, key);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

async function deleteChunk(db: IDBDatabase, key: string): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction('chunks', 'readwrite');
        const s = tx.objectStore('chunks');
        const req = s.delete(key);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

async function deleteModelMeta(db: IDBDatabase, modelId: string): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction('models', 'readwrite');
        const s = tx.objectStore('models');
        const req = s.delete(modelId);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

async function loadChunk(db: IDBDatabase, key: string): Promise<ArrayBuffer> {
    return new Promise((res, rej) => {
        const tx = db.transaction('chunks', 'readonly');
        const s = tx.objectStore('chunks');
        const req = s.get(key);
        req.onsuccess = () => res(req.result as ArrayBuffer);
        req.onerror = () => rej(req.error);
    });
}

function splitIntoChunks(buffer: ArrayBuffer): ArrayBuffer[] {
    const chunks: ArrayBuffer[] = [];
    const view = new Uint8Array(buffer);
    for (let i = 0; i < view.byteLength; i += CHUNK_SIZE) {
        const slice = view.subarray(i, Math.min(i + CHUNK_SIZE, view.byteLength));
        chunks.push(slice.buffer.slice(0));
    }
    return chunks;
}

async function fetchWithProgress(
    url: string,
    onProgress: (loaded: number, total?: number) => void
): Promise<ArrayBuffer> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    const reader = resp.body?.getReader();
    const total = resp.headers.get('content-length')
        ? parseInt(resp.headers.get('content-length')!, 10)
        : undefined;
    let received = 0;
    const parts: Uint8Array[] = [];
    if (!reader) return resp.arrayBuffer();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            parts.push(value);
            received += value.length;
            onProgress(received, total);
        }
    }
    const buf = new Uint8Array(received);
    let pos = 0;
    for (const chunk of parts) {
        buf.set(chunk, pos);
        pos += chunk.length;
    }
    return buf.buffer;
}

/**
 * Downloads or loads from IndexedDB the full model binary.
 * @param urls Array of URLs (in-order) that together form the model binary
 * @param modelId Any unique identifier (e.g. hash or passed in)
 * @param progressCallback Optional callback to track progress
 * @returns assembled ArrayBuffer of the model
 */
export async function loadOrFetchModel(
    url: string,
    modelId: string,
    progressCallback?: ProgressCallback
): Promise<ArrayBuffer> {
    const db = await openDb();
    const existing = await getModelMeta(db, modelId);
    if (existing) {
        const buffers = await Promise.all(existing.chunkKeys.map(k => loadChunk(db, k)));
        const totalBytes = buffers.reduce((s, b) => s + b.byteLength, 0);
        const out = new Uint8Array(totalBytes);
        let offset = 0;
        for (const b of buffers) {
            out.set(new Uint8Array(b), offset);
            offset += b.byteLength;
        }
        progressCallback?.({ type: 'complete', modelId, totalBytes });
        return out.buffer;
    }

    const chunkKeys: string[] = [];
    let chunkCounter = 0;

    const buf = await fetchWithProgress(url, (loaded, total) =>
        progressCallback?.({ type: 'download', url, loaded, total })
    );

    const parts = splitIntoChunks(buf);
    for (const p of parts) {
        const key = `${modelId}::chunk::${chunkCounter}`;
        await storeChunk(db, key, p);
        chunkKeys.push(key);
        progressCallback?.({
            type: 'chunkStored',
            modelId,
            chunkIndex: chunkCounter,
            bytesStored: p.byteLength,
        });
        chunkCounter++;
    }

    await putModelMeta(db, { modelId, chunkKeys });

    const buffers = await Promise.all(chunkKeys.map(k => loadChunk(db, k)));
    const totalBytes = buffers.reduce((s, b) => s + b.byteLength, 0);
    const out = new Uint8Array(totalBytes);
    let offset = 0;
    for (const b of buffers) {
        out.set(new Uint8Array(b), offset);
        offset += b.byteLength;
    }

    progressCallback?.({ type: 'complete', modelId, totalBytes });
    return out.buffer;
}

// Stream the model from network and store into IndexedDB in fixed-size chunks,
// without ever assembling the full model in memory.
export async function streamAndStoreModel(
    url: string,
    modelId: string,
    progressCallback?: ProgressCallback
): Promise<void> {
    const db = await openDb();
    const existing = await getModelMeta(db, modelId);
    if (existing) {
        // Already stored
        progressCallback?.({ type: 'info', modelId, msg: 'Already cached' });
        return;
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    const reader = resp.body?.getReader();
    if (!reader) {
        // Fallback: small files path
        const buf = await resp.arrayBuffer();
        const parts = splitIntoChunks(buf);
        const chunkKeys: string[] = [];
        let chunkCounter = 0;
        for (const p of parts) {
            const key = `${modelId}::chunk::${chunkCounter}`;
            await storeChunk(db, key, p);
            chunkKeys.push(key);
            progressCallback?.({ type: 'chunkStored', modelId, chunkIndex: chunkCounter, bytesStored: p.byteLength });
            chunkCounter++;
        }
        await putModelMeta(db, { modelId, chunkKeys });
        const totalBytes = parts.reduce((s, b) => s + b.byteLength, 0);
        progressCallback?.({ type: 'complete', modelId, totalBytes });
        return;
    }

    const total = resp.headers.get('content-length')
        ? parseInt(resp.headers.get('content-length')!, 10)
        : undefined;
    let received = 0;
    let chunkCounter = 0;
    const chunkKeys: string[] = [];
    let buffer = new Uint8Array(CHUNK_SIZE);
    let offset = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        let src = value;
        while (src.byteLength > 0) {
            const space = buffer.byteLength - offset;
            const toCopy = Math.min(space, src.byteLength);
            buffer.set(src.subarray(0, toCopy), offset);
            offset += toCopy;
            received += toCopy;
            progressCallback?.({ type: 'download', url, loaded: received, total });
            src = src.subarray(toCopy);

            if (offset === buffer.byteLength) {
                // flush
                const key = `${modelId}::chunk::${chunkCounter}`;
                await storeChunk(db, key, buffer.buffer.slice(0));
                chunkKeys.push(key);
                progressCallback?.({ type: 'chunkStored', modelId, chunkIndex: chunkCounter, bytesStored: buffer.byteLength });
                chunkCounter++;
                buffer = new Uint8Array(CHUNK_SIZE);
                offset = 0;
            }
        }
    }

    if (offset > 0) {
        const finalBuf = new Uint8Array(offset);
        finalBuf.set(buffer.subarray(0, offset));
        const key = `${modelId}::chunk::${chunkCounter}`;
        await storeChunk(db, key, finalBuf.buffer);
        chunkKeys.push(key);
        progressCallback?.({ type: 'chunkStored', modelId, chunkIndex: chunkCounter, bytesStored: finalBuf.byteLength });
    }

    await putModelMeta(db, { modelId, chunkKeys });
    const totalBytes = chunkKeys.length * CHUNK_SIZE - (CHUNK_SIZE - offset) % CHUNK_SIZE;
    progressCallback?.({ type: 'complete', modelId, totalBytes });
}

// Generic data storage functions for JSON/config data
export async function storeData(key: string, data: any): Promise<void> {
    const db = await openDb();
    return new Promise((res, rej) => {
        const tx = db.transaction('chunks', 'readwrite');
        const store = tx.objectStore('chunks');
        const req = store.put(data, key);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

export async function loadData(key: string): Promise<any> {
    const db = await openDb();
    return new Promise((res, rej) => {
        const tx = db.transaction('chunks', 'readonly');
        const store = tx.objectStore('chunks');
        const req = store.get(key);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}

// Check if model data exists in storage
export async function hasModelData(modelId: string): Promise<boolean> {
    const db = await openDb();
    const meta = await getModelMeta(db, modelId);
    return !!meta;
}

// Remove stored chunks and meta for a model
export async function deleteModelData(modelId: string): Promise<boolean> {
    const db = await openDb();
    const meta = await getModelMeta(db, modelId);
    if (!meta) return false;
    for (const key of meta.chunkKeys) {
        try { await deleteChunk(db, key); } catch {
            // ignore individual chunk delete errors
        }
    }
    try { await deleteModelMeta(db, modelId); } catch {
        // ignore
    }
    return true;
}