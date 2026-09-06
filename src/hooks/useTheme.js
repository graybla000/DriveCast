import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

// Theme toggle. Dark is the default (set on <html> in index.html).
export function useTheme() {
  const [theme, setTheme] = useLocalStorage("drivecast:theme", "dark");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggleTheme };
}