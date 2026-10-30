# Firebase setup for the leaderboard (about 10 minutes)

## 1. Create the project
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Create a project** (or **Add project**). Name it `snake-game`.
3. When it asks about Google Analytics, turn it **off**. Click **Create project**.

## 2. Create the database
1. In the left menu, open **Build → Firestore Database**.
2. Click **Create database**.
3. Location: keep the default. Click **Next**.
4. Choose **Start in production mode**. Click **Create**.

## 3. Set the rules (who can read and write scores)
1. Still in Firestore, open the **Rules** tab.
2. Delete everything in the box and paste this in:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // A score must be 3 capital letters and a sensible number.
    function validScore() {
      return request.resource.data.keys().hasOnly(['name', 'score', 'createdAt'])
        && request.resource.data.name is string
        && request.resource.data.name.matches('^[A-Z]{3}$')
        && request.resource.data.score is int
        && request.resource.data.score >= 1
        && request.resource.data.score <= 5000
        && request.resource.data.createdAt == request.time;
    }
    // One leaderboard per mode. Anyone can see them and add a score.
    // Nobody can change or delete scores from the game (you can in the console).
    match /scores_easy/{id} {
      allow read: if true;
      allow create: if validScore();
    }
    match /scores_medium/{id} {
      allow read: if true;
      allow create: if validScore();
    }
    match /scores_easy_snakes/{id} {
      allow read: if true;
      allow create: if validScore();
    }
    match /scores_medium_snakes/{id} {
      allow read: if true;
      allow create: if validScore();
    }
    // Usage counts for stats.html: one record per day, only these numbers.
    match /stats/{day} {
      allow read: if true;
      allow create, update: if day.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && request.resource.data.keys().hasOnly(['visits', 'phone_visits', 'computer_visits', 'games', 'rooms',
             'games_easy', 'games_easy_snakes', 'games_medium', 'games_medium_snakes', 'games_twoplayer', 'games_online']);
    }
  }
}
```

3. Click **Publish**.

## 3b. Create the live database (for online rooms and chat)
Firestore (above) is great for the leaderboard but too slow for live play,
so online rooms use Firebase's other database, the Realtime Database.
1. In the left menu, open **Build → Realtime Database**.
2. Click **Create Database**. Location: **United States**. Click **Next**.
3. Choose **Start in locked mode**. Click **Enable**.
4. Open the **Rules** tab, delete everything in the box and paste this in:

```
{
  "rules": {
    "rooms": {
      "$code": {
        // Anyone who knows a room's 5-letter code can join it.
        ".read": "$code.matches(/^[A-Z0-9]{5}$/)",
        ".write": "$code.matches(/^[A-Z0-9]{5}$/)"
      }
    }
  }
}
```

5. Click **Publish**.

Do this step **before** step 4, so the config you copy includes the database address (`databaseURL`).

## 4. Connect it to the game
1. Click the **gear icon** next to "Project Overview" → **Project settings**.
2. Scroll to **Your apps** and click the **web icon** `</>`.
3. App nickname: `snake`. Leave "Firebase Hosting" unticked. Click **Register app**.
4. You'll see a code block containing `const firebaseConfig = { ... }`. Copy just that part and paste it in the chat thread.

The firebaseConfig is safe to share. It's designed to be public, and the rules in step 3 are what protect the database.

## Removing a bad score later
Firestore Database → **Data** tab → `scores_easy`, `scores_easy_snakes`, `scores_medium` or `scores_medium_snakes` → click the entry → the ⋮ menu → **Delete document**.
