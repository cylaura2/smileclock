import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { AppState } from '../types';

export type BackupFile = {
  app: 'smileclock';
  schemaVersion: number;
  exportedAt: string;
  data: AppState;
};

export function buildBackup(schemaVersion: number, data: AppState): BackupFile {
  return {
    app: 'smileclock',
    schemaVersion,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Write the backup to a file and offer the share/save sheet (or download on web). */
export async function exportBackup(payload: BackupFile): Promise<{ ok: boolean; message?: string }> {
  const json = JSON.stringify(payload, null, 2);
  const filename = `smileclock-backup-${payload.exportedAt.slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  }

  try {
    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your SmileClock backup',
        UTI: 'public.json',
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/** Let the user pick a backup file and return its parsed contents. */
export async function importBackup(): Promise<BackupFile | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => {
          try {
            resolve(JSON.parse(String(reader.result)));
          } catch {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(f);
      };
      input.click();
    });
  }

  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A backup is valid if it carries an object `data` with a sessions array. */
export function isValidBackup(file: any): file is BackupFile {
  return (
    !!file &&
    typeof file === 'object' &&
    file.app === 'smileclock' &&
    file.data &&
    Array.isArray(file.data.sessions)
  );
}
