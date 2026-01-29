# Firebase Setup Instructions

Your project has `firebase` installed, but you need to connect it to your Firebase Project.

## Step 1: Create Environment File
Create a new file in this directory named `.env.local`.

## Step 2: Add Credentials
Copy the following content into `.env.local` and replace the values with your actual keys from the Firebase Console (Project Settings > General > Your Apps).

```env
NEXT_PUBLIC_FIREBASE_API_KEY=replace_with_your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=replace_with_your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=replace_with_your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=replace_with_your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=replace_with_your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=replace_with_your_app_id
```

## Step 3: Restart Server
After saving the file, you must stop (`Ctrl+C`) and restart your development server:
```bash
npm run dev
```
