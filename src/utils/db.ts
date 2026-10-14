import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from './supabase';

export interface SavedHapticPattern {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  patternData: number[]; // Array of pulse/pause durations in ms
  createdAt: string;
}

interface MotionDB extends DBSchema {
  haptic_patterns: {
    key: string;
    value: SavedHapticPattern;
  };
}

let dbPromise: Promise<IDBPDatabase<MotionDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MotionDB>('motion-pwa-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('haptic_patterns')) {
          db.createObjectStore('haptic_patterns', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// --- Local IndexedDB Methods ---

export const saveLocalPattern = async (pattern: SavedHapticPattern): Promise<void> => {
  const db = await getDB();
  await db.put('haptic_patterns', pattern);
};

export const getLocalPatterns = async (): Promise<SavedHapticPattern[]> => {
  const db = await getDB();
  return db.getAll('haptic_patterns');
};

export const deleteLocalPattern = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('haptic_patterns', id);
};

export const exportPatternJSON = (pattern: SavedHapticPattern): void => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pattern, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${pattern.title.toLowerCase().replace(/\s+/g, '_')}_haptic.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// --- Cloud Supabase Sync Methods ---

export const fetchCloudPatterns = async (): Promise<SavedHapticPattern[]> => {
  const { data, error } = await supabase
    .from('community_patterns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patterns from Supabase:', error);
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author_id || 'Anonymous',
    category: item.category || 'General',
    description: item.description,
    patternData: item.pattern_data,
    createdAt: item.created_at,
  }));
};

export const uploadPatternToCloud = async (pattern: SavedHapticPattern): Promise<boolean> => {
  const { error } = await supabase.from('community_patterns').insert([
    {
      title: pattern.title,
      description: pattern.description,
      category: pattern.category,
      pattern_data: pattern.patternData,
    },
  ]);

  if (error) {
    console.error('Error uploading pattern:', error);
    return false;
  }
  return true;
};