import React from "react";
import {
  Alert as NativeAlert,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AlertButton,
  type AlertOptions,
} from "react-native";
type Notice = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};
const queue: Notice[] = [];
const listeners = new Set<() => void>();
function publish() {
  listeners.forEach((listener) => listener());
}
export const AppAlert = {
  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) {
    if (Platform.OS !== "web") {
      NativeAlert.alert(title, message, buttons, options);
      return;
    }
    queue.push({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: "OK" }],
      options,
    });
    publish();
  },
};
export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const notice = React.useSyncExternalStore(
    React.useCallback((listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }, []),
    () => queue[0],
    () => undefined,
  );
  function dismiss() {
    if (notice?.options?.cancelable === false) return;
    const cancel = notice?.buttons.find((button) => button.style === "cancel");
    queue.shift();
    publish();
    notice?.options?.onDismiss?.();
    cancel?.onPress?.();
  }
  function choose(button: AlertButton) {
    queue.shift();
    publish();
    try {
      const action: unknown = button.onPress?.();
      void Promise.resolve(action).catch(() =>
        AppAlert.alert("Unable to complete action", "Please try again."),
      );
    } catch {
      AppAlert.alert("Unable to complete action", "Please try again.");
    }
  }
  return (
    <>
      {children}
      <Modal
        visible={!!notice}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View style={styles.backdrop}>
          <View style={styles.panel} accessibilityViewIsModal>
            <Text style={styles.title}>{notice?.title}</Text>
            <ScrollView>
              <Text style={styles.body}>{notice?.message}</Text>
            </ScrollView>
            <View style={styles.actions}>
              {notice?.buttons.map((button, index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  onPress={() => choose(button)}
                  style={[
                    styles.button,
                    button.style === "cancel" && styles.cancel,
                    button.style === "destructive" && styles.destructive,
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      button.style === "cancel" && styles.cancelLabel,
                    ]}
                  >
                    {button.text || "OK"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,.45)",
  },
  panel: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 12,
  },
  body: { fontSize: 14, lineHeight: 22, color: "#526174" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 22,
  },
  button: {
    minHeight: 44,
    minWidth: 80,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#2864e8",
  },
  cancel: { backgroundColor: "#edf3ff" },
  destructive: { backgroundColor: "#c43c3c" },
  label: { color: "#fff", fontWeight: "600" },
  cancelLabel: { color: "#2864e8" },
});
