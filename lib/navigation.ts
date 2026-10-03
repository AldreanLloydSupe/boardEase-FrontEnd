import type { Href } from "expo-router";

type BackNavigation = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (destination: Href) => void;
};

export function backOrReplace(navigation: BackNavigation, fallback: Href) {
  if (navigation.canGoBack()) navigation.back();
  else navigation.replace(fallback);
}
