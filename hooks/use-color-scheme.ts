import { useColorScheme as useNativeColorScheme } from "react-native";

export function useColorScheme(): "light" | "dark" {
  return useNativeColorScheme() === "dark" ? "dark" : "light";
}
