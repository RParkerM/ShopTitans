import { useState, useCallback } from 'react';
import type { UserData, UserBlueprintData } from '../types';

const STORAGE_KEY = 'st_user_data';

function loadFromStorage(): UserData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserData) : {};
  } catch {
    return {};
  }
}

const DEFAULT_DATA: UserBlueprintData = { owned: false, starforged: false, ascensionLevel: 0, craftCount: 0 };

export function useUserData() {
  const [userData, setUserData] = useState<UserData>(loadFromStorage);

  const update = useCallback((name: string, patch: Partial<UserBlueprintData>) => {
    setUserData(prev => {
      const next = {
        ...prev,
        [name]: { ...(prev[name] ?? DEFAULT_DATA), ...patch },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const get = useCallback((name: string): UserBlueprintData => {
    return userData[name] ?? DEFAULT_DATA;
  }, [userData]);

  return { get, update };
}
