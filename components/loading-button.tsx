import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

type LoadingButtonProps = Omit<PressableProps, "onPress" | "children"> & {
  title: string;
  onPress: () => void | Promise<void>;
  loadingText?: string;
  indicatorColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/** Runs an async action once at a time and shows a spinner while it is pending. */
export function LoadingButton({
  title,
  onPress,
  loadingText,
  indicatorColor = "#fff",
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  ...pressableProps
}: LoadingButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const inFlight = React.useRef(false);

  const handlePress = React.useCallback(async () => {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setLoading(true);
    try {
      await onPress();
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [disabled, onPress]);

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={Boolean(disabled || loading)}
      onPress={handlePress}
      style={[styles.button, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <>
          <ActivityIndicator color={indicatorColor} size="small" />
          {loadingText ? <Text style={[styles.text, textStyle]}>{loadingText}</Text> : null}
        </>
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#2864e8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  disabled: { opacity: 0.65 },
  text: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
