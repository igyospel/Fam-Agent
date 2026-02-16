# Google OAuth Setup Guide

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Fam Agent")
4. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in app name, user support email, and developer contact
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed
   - Save and continue

4. Back in "Create OAuth client ID":
   - Application type: "Web application"
   - Name: "Fam Agent Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for Vite dev server)
     - `http://localhost:3000` (if using different port)
     - Add your production domain when deploying
   - Authorized redirect URIs:
     - `http://localhost:5173`
     - `http://localhost:3000`
     - Add your production domain when deploying
   - Click "Create"

5. Copy the **Client ID** that appears

## Step 4: Add Client ID to Your Project

1. Create a `.env` file in the root of your project (copy from `.env.example`):
   ```
   VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
   ```

2. Replace `your_actual_client_id_here` with the Client ID you copied

3. **Important**: Add `.env` to your `.gitignore` file to keep your credentials safe

## Step 5: Restart Development Server

After adding the `.env` file, restart your development server:

```bash
npm run dev
```

## Testing

1. Click "Continue with Google" on the login page
2. You should see the Google account picker
3. Select your Google account
4. Grant permissions
5. You should be logged in with your real Google account!

## Troubleshooting

- **"redirect_uri_mismatch" error**: Make sure the URL in your browser matches one of the authorized redirect URIs exactly
- **"Access blocked" error**: Add your email as a test user in the OAuth consent screen
- **Client ID not found**: Make sure you've created the `.env` file and restarted the dev server

## Production Deployment

When deploying to production:
1. Add your production domain to "Authorized JavaScript origins" and "Authorized redirect URIs"
2. Set the `VITE_GOOGLE_CLIENT_ID` environment variable in your hosting platform
3. Consider moving from "Testing" to "Production" status in the OAuth consent screen
