# Prayer Journal

A todo-list style prayer app. Add prayer requests, record how God answered them, filter between active and answered, tag entries for organization, log individual prayer sessions, and receive push notifications on your phone.

## Features

- **Prayer requests** — add a person, request text, and tags
- **Answers** — record how God answered and mark prayers complete
- **Prayer log** — tap "I Prayed This" to log each session with optional notes
- **Calendar view** — see your prayer activity by day
- **Search** — full-text search across requests, answers, and tags
- **Export** — download your journal as a Word (.docx) document
- **Push notifications** — daily digest and per-prayer reminders via ntfy

## Running with Docker

### Quick start (pull pre-built image)

```bash
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

### Build locally

```bash
docker compose up --build -d
```

### Data persistence

All data is stored in the bind-mounted `/data` directory:

| File | Contents |
|------|----------|
| `prayers.json` | All prayer requests and logs |
| `settings.json` | Notification settings (ntfy topic, times) |

The default host path is `/media/ZimaOS-HD/AppData/Prayer/Data`. Change the `volumes` line in `docker-compose.yml` to match your server.

### Timezone

Notification times (daily digest, reminders) are evaluated in the container's timezone. Set the `TZ` environment variable in `docker-compose.yml` to your local timezone so times fire when you expect:

```yaml
environment:
  - TZ=America/Chicago   # or America/New_York, Europe/London, etc.
```

Restart the container after changing the timezone:

```bash
docker compose up -d
```

## Push Notifications (ntfy)

Prayer Journal sends notifications via [ntfy.sh](https://ntfy.sh) — a free, open-source push service that works without an account.

### Setup

1. **Install the ntfy app** on your phone — search "ntfy" on the App Store or Google Play, or visit [ntfy.sh](https://ntfy.sh)
2. **Open the app** and add a subscription to your chosen topic name (e.g. `my-prayers-7x3q9`). Pick something unique and hard to guess — anyone who knows the topic can subscribe.
3. **Open Prayer Journal** in the browser and click **🔔 Notifications** in the header
4. **Enter the same topic name** and configure:
   - **Daily digest time** — receive a list of all active prayers at this time each day (leave blank to disable)
   - **Per-prayer reminder time** — the time of day individual prayer reminders fire
5. **Click "Send test"** to verify everything is working

### Per-prayer reminders

On any active prayer card, expand it and use the **🔔 Remind me** row to pick which days of the week you want a reminder for that prayer. The reminder fires at the per-prayer reminder time configured in settings.

### Self-hosted ntfy

If you run your own ntfy server, enter the full URL as the topic:

```
https://your-ntfy-server.example.com/my-topic
```

## CI / CD

Pushes to `main` trigger a GitHub Actions workflow (`.github/workflows/docker.yml`) that:

1. Builds the Docker image (multi-stage: Node 22 build → Node 22 runtime)
2. Pushes to GitHub Container Registry (`ghcr.io/nmemmert/prayer`)
3. Tags the image as `latest`, the branch name, and the short commit SHA

The `GITHUB_TOKEN` secret is used automatically — no additional secrets required.

## Development

```bash
npm install
npm start        # React dev server on :3000
node server.js   # API + notification server on :4000
```

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript |
| Backend | Node.js, Express |
| Notifications | ntfy.sh (via node-cron + fetch) |
| Data | JSON files on a bind-mounted host directory |
| Images | GitHub Container Registry (ghcr) |
| CI/CD | GitHub Actions |
