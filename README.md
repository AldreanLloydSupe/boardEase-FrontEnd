# BoardEase frontend

Expo tenant and landlord app using Firebase Authentication and Firestore.

```powershell
npm install
npx expo start
```

Copy `.env.example` to `.env` and fill in the project Firebase values. See the sibling backend README for rules deployment and landlord custom claims. After installing the Clipboard dependency, restart Expo; rebuild your custom development client if it does not include that native module.

Assigned tenants use Home, Payments, QR, Requests, and Profile. Applicants use Rooms, Applied, Saved, and Account. The layouts guard those routes independently.

From the landlord dashboard, use Property Settings to configure actual caretaker and GCash receiver details, rules, and notices. Room approval/move-out uses transactions; payment proofs require landlord review. Photos are small shared data URLs saved in Firestore. Notifications and reminder calculations work while the app is open.

```powershell
npm run typecheck
npm run lint
npm test
npx expo export --platform web
```

The backend emulator suite verifies access rules and tenant/landlord workflow permissions. No live tenant account or payment should be used as test data.
