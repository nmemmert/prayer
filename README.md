# Prayer Journal

A todo-list style prayer app. Add prayer requests, record how God answered them, filter between active and answered, and tag entries for organization. Data persists to a mounted Docker volume.

## Running with Docker

### Pull the pre-built image (recommended)

```bash
docker compose up -d
```

The `docker-compose.yml` pulls `ghcr.io/nmemmert/prayer:latest` automatically. Open [http://localhost:3000](http://localhost:3000).

### Build locally

```bash
docker compose up --build -d
```

### Data persistence

Prayer data is stored in `/data/prayers.json` inside the container, mounted as the named Docker volume `prayer-data`. Data survives container restarts and image updates.

To inspect or back up your data:

```bash
# Print current prayers
docker compose exec prayer cat /data/prayers.json

# Copy to host
docker cp $(docker compose ps -q prayer):/data/prayers.json ./prayers-backup.json
```

To wipe all data:

```bash
docker compose down -v
```

### Using a host-bind mount instead of a named volume

Replace the `volumes` block in `docker-compose.yml`:

```yaml
volumes:
  - ./prayer-data:/data
```

## CI / CD

Pushes to `main` trigger a GitHub Actions workflow (`.github/workflows/docker.yml`) that:

1. Builds the Docker image (multi-stage: Node 20 → Node 20 slim)
2. Pushes to GitHub Container Registry (`ghcr.io/nmemmert/prayer`)
3. Tags the image as `latest`, the branch name, and the short commit SHA

Pull requests run the build step only (no push).

The `GITHUB_TOKEN` secret is used automatically — no additional secrets are required.

## Development

```bash
npm install
npm start        # React dev server on :3000 (uses localStorage, no backend)
node server.js   # API server on :4000 (reads/writes data/prayers.json)
```

For full local dev with the backend:

```bash
node server.js &
REACT_APP_API_BASE=http://localhost:4000 npm start
```

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18, TypeScript              |
| Backend  | Node.js, Express                  |
| Data     | JSON file on a Docker volume      |
| Images   | GitHub Container Registry (ghcr)  |
| CI/CD    | GitHub Actions                    |
