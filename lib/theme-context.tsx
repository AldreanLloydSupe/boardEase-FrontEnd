import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Appearance } from "react-native";

const THEME_STORAGE_KEY = "boardease-theme";

type ThemeContextValue = {
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
};

const ThemeContext = React.createContext<ThemeContextValue>({
  darkMode: false,
  setDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => {
        if (!mounted || value === null) return;
        const enabled = value === "dark";
        setDarkModeState(enabled);
        Appearance.setColorScheme(enabled ? "dark" : "light");
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const setDarkMode = React.useCallback((enabled: boolean) => {
    setDarkModeState(enabled);
    Appearance.setColorScheme(enabled ? "dark" : "light");
    void AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? "dark" : "light");
  }, []);

  const value = React.useMemo(() => ({ darkMode, setDarkMode }), [darkMode, setDarkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return React.useContext(ThemeContext);
}
