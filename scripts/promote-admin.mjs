import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email)
  throw new Error("Usage: npm run promote-admin -- admin@example.com");
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS)
  throw new Error(
    "Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service-account JSON path first.",
  );
const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
const user = await getAuth(app).getUserByEmail(email);
await getAuth(app).setCustomUserClaims(user.uid, {
  admin: true,
  role: "landlord",
});
console.log(
  `Promoted ${email} to landlord admin. Sign out and sign in again to refresh the claim.`,
);
