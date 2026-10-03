import { Redirect } from "expo-router";

// The app entry is Login; authenticated deep routes restore their saved session.
export default function Index() {
  return <Redirect href="/login" />;
}
