'use client';

// It is highly recommended to use environment variables for Firebase configuration
// to avoid exposing sensitive keys in your source code.

// 1. Create a .env.local file in the root of your project.
// 2. Add your Firebase configuration variables to the .env.local file.
//    Example:
//    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
//    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
//    ...

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function checkFirebaseConfig() {
    // This check is now handled visually in FirebaseClientProvider.
}
