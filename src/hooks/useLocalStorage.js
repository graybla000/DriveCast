import { useState, useEffect, useCallback } from "react";

// Generic localStorage-backed state hook. Abstracts persistence so the
// data layer can later swap to entities/API without touching consumers.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [key, value]);

  const update = useCallback((next) => {
    setValue(next);
  }, []);

  return [value, update];
}