# Reflections Journal

**Live Application URL**: [https://reflections-journals.ai.studio](https://reflections-journals.ai.studio)

A user-authenticated, private reflective journaling application powered by **Gemini 3.6 Flash** and **Google Cloud Firestore**. Every journal entry, conversational reflection turn, and AI-generated summary is strictly isolated to the authenticated user using Firebase Authentication and Firestore Security Rules.

---

## Architecture Overview

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **User Identity** | Firebase Authentication | Google Sign-In with popup; zero raw password storage. |
| **Backend Database** | Google Cloud Firestore | Document storage partitioned per user (`/users/{userId}/entries/{entryId}`). |
| **AI Processing Engine** | Gemini 3.6 Flash API (`@google/genai`) | Multi-turn reflections, brainstorming perspectives, and thematic summaries with resilient fallback ladder. |
| **Backend Server** | Express.js + Vite | Secure API proxy keeping `GEMINI_API_KEY` hidden server-side with defensive payload ingestion. |
| **Secret Management** | Google Cloud Secret Manager | Dynamic runtime credential resolution and zero-hardcoding hygiene. |

---

## 1. Environment & Prerequisites

Ensure the following tools and services are enabled in your Google Cloud Project:

1. **Install Google Cloud SDK (`gcloud`)** and Firebase CLI:
   ```bash
   curl https://sdk.cloud.google.com | bash
   npm install -g firebase-tools
   ```

2. **Authenticate with GCP**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Enable Required Google Cloud APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     identitytoolkit.googleapis.com
   ```

---

## 2. Secret Management Setup

Do not store secrets or API keys in source control. Use Google Cloud Secret Manager:

```bash
# Create the secret for Gemini API Key
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your Gemini API Key secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run compute service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration

Deploy user-isolated Firestore Security Rules so each authenticated user can strictly access only their own entries:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NODE_ENV=development
   ```

3. Start unified dev server (Express + Vite on port 3000):
   ```bash
   npm run dev
   ```

---

## 5. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run:

```bash
# Build and deploy service to Cloud Run
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

Apply the mandatory challenge verification label to your Cloud Run service:

```bash
gcloud run services update reflections-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 7. Automated Model Fallback Ladder

The application utilizes a resilient multi-tier fallback protocol for all Gemini AI operations:
1. **Primary Model**: `gemini-3.6-flash`
2. **High-Availability Fallback**: `gemini-3.1-flash-lite`
3. **Dynamic Alias**: `gemini-flash-latest`
4. **Deep Reasoning Fallback**: `gemini-3.7-flash`

Recoverable errors (`503`, `429`, `404`, `500`) trigger sequential retry across models before surfacing errors to the user.

---

## 8. Production SEO & Web App Standards

The application is packaged with comprehensive search-engine optimization, metadata indexing, and web standards:
- **Search Engine Discovery**: `/robots.txt` and `/sitemap.xml` configured for multi-engine crawling with API route protection.
- **Rich Snippets & JSON-LD**: Embedded Schema.org `WebApplication` structured data defining features, pricing (`Free`), and capabilities.
- **Social Sharing Previews**: Open Graph and Twitter Card tags configured with high-resolution visual cards (`/og-preview.svg`).
- **PWA & Mobile Ready**: `/site.webmanifest` and scalable SVG favicons (`/favicon.svg`) with theme color `#0c0a09` for immersive mobile and desktop experiences.
- **HTTP Security Headers**: Express server provides `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 9. GitHub Secret Scanning & Firebase API Key Security

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
   - Optional: In [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials), you can restrict your Firebase Web API key to only accept HTTP referrers from your domains (`https://reflections-journals.ai.studio` and your Cloud Run domain).


