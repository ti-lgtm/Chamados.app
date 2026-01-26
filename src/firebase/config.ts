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

// This function checks if the essential Firebase config variables are loaded.
// It helps in debugging configuration issues.
export function checkFirebaseConfig() {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.storageBucket) {
        console.error(
            "Firebase config error: One or more Firebase environment variables are not defined. Please check your .env.local file and your Vercel project settings. Required variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET."
        );
    }
}
