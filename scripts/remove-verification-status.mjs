import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
if (args.some((argument) => argument !== "--apply")) {
  throw new Error(
    "Usage: npm run remove-verification-status [-- --apply]",
  );
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    "Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service-account JSON path first.",
  );
}

const applyChanges = args.includes("--apply");
const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
const firestore = getFirestore(app);
const users = await firestore.collection("users").get();
const profiles = users.docs.filter((user) =>
  Object.hasOwn(user.data(), "verificationStatus"),
);

console.log(`Found ${profiles.length} user profiles with verificationStatus.`);

if (!applyChanges) {
  console.log("Dry run only. Add -- --apply to delete this field.");
  process.exit(0);
}

for (let offset = 0; offset < profiles.length; offset += 500) {
  const batch = firestore.batch();
  for (const profile of profiles.slice(offset, offset + 500)) {
    batch.update(profile.ref, {
      verificationStatus: FieldValue.delete(),
    });
  }
  await batch.commit();
}

console.log(`Deleted verificationStatus from ${profiles.length} user profiles.`);