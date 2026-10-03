import React from "react";
import { Platform } from "react-native";
import NativePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
type Props = {
  value: Date;
  mode: "date" | "time";
  minimumDate?: Date;
  display?: "default" | "spinner" | "compact";
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
};
function dateText(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export default function UniversalDateTimePicker(props: Props) {
  if (Platform.OS !== "web") return <NativePicker {...props} />;
  const value =
    props.mode === "date"
      ? dateText(props.value)
      : `${String(props.value.getHours()).padStart(2, "0")}:${String(props.value.getMinutes()).padStart(2, "0")}`;
  return React.createElement("input", {
    type: props.mode,
    value,
    min:
      props.mode === "date" && props.minimumDate
        ? dateText(props.minimumDate)
        : undefined,
    "aria-label": props.mode === "date" ? "Select date" : "Select time",
    style: {
      width: "100%",
      minHeight: 44,
      padding: 8,
      border: "1px solid #d4e0f0",
      borderRadius: 8,
      boxSizing: "border-box",
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.value) return;
      const next = new Date(props.value);
      if (props.mode === "date") {
        const [year, month, day] = event.target.value.split("-").map(Number);
        next.setFullYear(year, month - 1, day);
      } else {
        const [hour, minute] = event.target.value.split(":").map(Number);
        next.setHours(hour, minute, 0, 0);
      }
      if (!Number.isNaN(next.getTime()))
        props.onChange(
          {
            type: "set",
            nativeEvent: {
              timestamp: next.getTime(),
              utcOffset: -next.getTimezoneOffset(),
            },
          },
          next,
        );
    },
  });
}
