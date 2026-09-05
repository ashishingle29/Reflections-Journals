# Reflections Journal

**Live Application URLs**:
- **Shared Preview App**: [https://ais-pre-lpatow4lohybqqtitfy5ow-292196678817.asia-east1.run.app](https://ais-pre-lpatow4lohybqqtitfy5ow-292196678817.asia-east1.run.app)
- **Development App**: [https://ais-dev-lpatow4lohybqqtitfy5ow-292196678817.asia-east1.run.app](https://ais-dev-lpatow4lohybqqtitfy5ow-292196678817.asia-east1.run.app)

A user-authenticated, private reflective journaling application powered by **Google Gemini 3.6 Flash** and **Google Cloud Firestore**. Every journal entry, conversational reflection turn, emotional insight, and AI summary is strictly isolated to the authenticated user using Firebase Authentication and kernel-enforced Firestore Security Rules.

---

## Architecture Overview

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **User Identity** | Firebase Authentication | Google Sign-In with popup; zero raw passwords handled or stored. |
| **Backend Database** | Google Cloud Firestore | Document storage strictly partitioned per user (`/users/{userId}/entries/{entryId}`). |
| **AI Reflection Engine** | Gemini API (`@google/genai`) | Multi-turn reflections, 3-angle perspective shifts, and thematic summaries with resilient fallback ladder. |
| **Full-Stack Server** | Express.js + Vite | Secure API proxy keeping `GEMINI_API_KEY` hidden server-side with defensive payload ingestion. |
| **Secret Management** | Google Cloud Secret Manager | Dynamic runtime credential resolution and zero-hardcoding hygiene. |
| **Geocoded Sanctuaries**| Google Maps Platform | Spatial mapping of reflection places with interactive map view and place markers. |

---

## 1. Quick Start: How to Clone & Run Locally

Follow these steps to run the project on your local machine:

### Step 1: Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/reflections-journal.git
cd reflections-journal
```

### Step 2: Install Node.js Dependencies
Ensure you have **Node.js 18+** installed:
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and configure your API keys (see [Environment Variables & Key Acquisition Guide](#2-environment-variables--key-acquisition-guide) below).

### Step 4: Run the Development Server
```bash
npm run dev
```
The application will boot at **`http://localhost:3000`** with Express handling API routes (`/api/gemini/reflect`, `/api/health`) and Vite serving frontend hot assets.

### Step 5: Build & Run in Production Mode
```bash
# Compile frontend with Vite and bundle server with esbuild
npm run build

# Start the compiled production server
npm start
```

---

## 2. Environment Variables & Key Acquisition Guide

The application uses both server-side secrets (for Gemini API calls) and client-side variables (for Firebase and Google Maps):

```env
# ==============================================================================
# SERVER-SIDE SECRETS (Never exposed to the browser)
# ==============================================================================
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
PORT=3000

# ==============================================================================
# CLIENT-SIDE CONFIGURATION (VITE_ prefixed)
# ==============================================================================
# Optional: Overrides values from firebase-applet-config.json
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...
VITE_FIRESTORE_DATABASE_ID=ai-studio-reflectionsjourn-6bcc3ecf-9f20-41f0-803a-a154d869fa5c

# Google Maps Platform API Key (for Sanctuary Maps & Geocoding)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_or_demo_key
```

### How to Obtain Each Key:

#### 1. Gemini API Key (`GEMINI_API_KEY`)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API key**.
3. Select your Google Cloud project (or generate a new project key).
4. Copy the API key and paste it as `GEMINI_API_KEY` in your `.env` file.
*(Note: On Google Cloud Run, store this key in **Google Cloud Secret Manager** instead of `.env` files).*

#### 2. Firebase & Cloud Firestore Credentials
The project includes a ready-to-use `firebase-applet-config.json`. If you want to connect your own Firebase project:
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. **Enable Authentication**:
   - Go to **Build** → **Authentication** → **Get Started**.
   - Under **Sign-in method**, enable **Google**.
   - Under **Authorized domains**, ensure `localhost`, `127.0.0.1`, and your Cloud Run deployment domain are added.
3. **Enable Cloud Firestore**:
   - Go to **Build** → **Firestore Database** → **Create Database**.
   - Choose your location and deploy the rules defined in `firestore.rules` (see Section 4).
4. **Obtain Web App Credentials**:
   - In **Project Settings** (gear icon) → **General**, scroll to **Your apps**.
   - Click the Web icon (`</>`), register your app, and copy the credentials object into `firebase-applet-config.json` or your `.env` file.

#### 3. Google Maps API Key (`VITE_GOOGLE_MAPS_API_KEY`)
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/google/maps-apis).
2. Enable **Maps JavaScript API** and **Places API**.
3. Create an API key under **Credentials**, optionally restrict it to your HTTP referrers, and assign it to `VITE_GOOGLE_MAPS_API_KEY`.

---

## 3. Secret Management Setup (Google Cloud Run)

For production deployment on Cloud Run, credentials must never be committed to source control. Use **Google Cloud Secret Manager**:

```bash
# 1. Create the secret for Gemini API Key
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the Cloud Run compute service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Database Security Configuration

Deploy user-isolated and RBAC-governed Firestore Security Rules so each authenticated user can strictly access only their own entries, while administrative directory features are protected:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper to determine if the requesting user has the admin role
    function isAdmin() {
      return request.auth != null && (
        request.auth.token.email.matches('(?i)ashishingle589@gmail\\.com') ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
      );
    }

    // User profile document: owners can read/write; admins can read and delete
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if isAdmin();
    }

    // User-owned private reflections: strictly owner-isolated (Zero Cross-Tenant Exposure)
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Platform Telemetry: Restricted exclusively to verified administrators
    match /system_telemetry/{docId} {
      allow read, write: if isAdmin();
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run:

```bash
# Build and deploy service to Cloud Run with Secret Manager binding
gcloud run deploy reflections-journal \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 6. Required Campaign Verification Labeling

To ensure verification for the **Google Cloud Run & AI Studio Challenge**, apply the mandatory challenge label to your deployed service:

```bash
gcloud run services update reflections-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 7. Automated Model Fallback Ladder

To ensure zero downtime from rate limits (`429`) or temporary model capacity issues (`503`), all reflection calls are wrapped in an automated fallback ladder:
1. **Primary Model**: `gemini-3.1-flash-lite` *(High-Availability & Low-Latency)*
2. **Dynamic Alias**: `gemini-flash-latest`
3. **Primary Flash**: `gemini-3.6-flash`
4. **Deep Reasoning Fallback**: `gemini-3.7-flash`

The server transparently cascades through the ladder and returns both the generated output and the model identifier used for telemetry.

---

## 8. GitHub Secret Scanning & Firebase API Key Security

If you export this repository to GitHub, you may receive an automated alert from GitHub Secret Scanning regarding a **Google API Key** found in `firebase-applet-config.json`.

### Why this happens and why your data is secure:
1. **Firebase Web API Keys are Public by Design**:
   - In Firebase Web client SDKs, the `apiKey` (`AIzaSy...`) is a **public identifier** that identifies your Firebase project to Google services in client browsers. It is NOT a secret administrative credential.
   - [Official Google Firebase Documentation](https://firebase.google.com/docs/projects/api-keys): *"Unlike API keys for other services, Firebase API keys for web apps are not secrets and do not need to be hidden."*
2. **True Security is Enforced by Firestore Security Rules (`firestore.rules`)**:
   - Having the Firebase API key and Project ID does **NOT** give anyone access to your database.
   - Every single read, write, and query is governed by `firestore.rules`:
     ```javascript
     match /users/{userId}/{document=**} {
       allow read, write: if request.auth != null && request.auth.uid == userId;
     }
     ```
   - Unauthenticated or unauthorized requests are rejected immediately by Google Cloud Firestore.
3. **Secret API Keys are strictly kept server-side**:
   - Sensitive keys like `GEMINI_API_KEY` are stored in Google Cloud Secret Manager / server environment variables and are **never** committed to git or exposed to the client browser.
4. **How to resolve the GitHub alert**:
   - On GitHub, navigate to **Security** → **Secret scanning alerts** and close the alert by selecting **"False positive"** or **"Used in tests/public client app"**.
   - Optional: In [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials), you can restrict your Firebase Web API key to only accept HTTP referrers from your domains.


