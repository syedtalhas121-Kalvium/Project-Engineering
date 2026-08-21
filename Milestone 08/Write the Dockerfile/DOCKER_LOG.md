# ShipAPI — Docker Log

## App Analysis

Start script: `npm start`, which runs `node src/server.js`.

Port: `3000` by default, controlled by `process.env.PORT`; the Dockerfile exposes port 3000.

Prisma dependency: Yes. The app imports `@prisma/client` in `src/controllers/shipmentController.js`, and `prisma/schema.prisma` defines a PostgreSQL datasource. The Docker build copies `prisma/` before running `npx prisma generate` so the generated client matches the schema. OpenSSL is installed because Prisma's native Alpine query engine requires it at runtime.

Environment variables needed: `PORT` (optional; defaults to 3000), `DATABASE_URL` (required by Prisma for database-backed shipment routes), and `JWT_SECRET` (used by the authorization middleware). These values are supplied at runtime with `--env-file .env`, not baked into the image.

The starter repository did not include a `package-lock.json`, so one was generated with `npm install --package-lock-only`. The lockfile is committed so `npm ci` can provide reproducible dependency installation.

## Build Log

Command:

```bash
docker build -t shipapi-backend .
```

Because the verification sandbox's Docker CLI uses the legacy builder, the build was executed with host networking:

```bash
docker build --network=host -t shipapi-backend .
```

Trimmed first successful build output:

```text
Step 1/10 : FROM node:20-alpine
Step 2/10 : WORKDIR /app
Step 3/10 : COPY package*.json ./
Step 4/10 : RUN npm ci --only=production
added 91 packages, and audited 92 packages in 1m
found 0 vulnerabilities
Step 5/10 : COPY prisma ./prisma/
Step 6/10 : RUN apk add --no-cache openssl
OK: 11.7 MiB in 19 packages
Step 7/10 : RUN npx prisma generate
✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in 56ms
Step 8/10 : COPY . .
Step 9/10 : EXPOSE 3000
Step 10/10 : CMD ["node", "src/server.js"]
Successfully built 4bb08bb854fc
Successfully tagged shipapi-backend:latest
```

After appending a harmless source comment to `src/server.js`, the second build was run with the same command. The dependency layer remained cached:

```text
Step 4/10 : RUN npm ci --only=production
 ---> Using cache
Step 7/10 : RUN npx prisma generate
 ---> Using cache
Step 8/10 : COPY . .
 ---> 3212ccd19e87
Successfully built 750b4a0badea
```

`Using cache` is the legacy-builder equivalent of BuildKit's `CACHED` output. The source-only change invalidated the later `COPY . .` layer but did not rerun `npm ci`.

Image summary:

```text
Image: shipapi-backend:latest
Image ID: sha256:4bb08bb854fc82ac6f1a0a09d5e19cad6633a0517c073ee2b92ca8efe942a099
Approximate size: 146 MB
```

## Run and Health Check

The required runtime environment was created locally from `.env.example` and passed only at container startup. The verification sandbox cannot create Docker's default bridge network because its kernel lacks the required iptables `raw` table, so host networking was used for the live check. The image and application command are unchanged.

Run command:

```bash
docker run \
  --network host \
  --env-file .env \
  -p 3000:3000 \
  --name shipapi \
  -d \
  shipapi-backend
```

Docker prints a warning that published ports are discarded in host-network mode; the application still listens on port 3000 and was reachable at `localhost:3000`.

`docker ps` output:

```text
NAMES     IMAGE             STATUS         PORTS
shipapi   shipapi-backend   Up 2 seconds
```

`curl -i http://localhost:3000/health` response:

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok","timestamp":"2026-08-21T09:12:58.168Z"}
```

HTTP Status: `200 OK`

Container log:

```text
Server running on port 3000
```

The container's `/app/node_modules` contains packages installed during the image build, including `@prisma`, `accepts`, `array-flatten`, `bcryptjs`, and `body-parser`. The local `.env` file is excluded by `.dockerignore` and was injected only at runtime.

## Observations

Putting `COPY . .` before `RUN npm ci` would cause every source-file change to invalidate the dependency-install layer, forcing a complete dependency installation on each rebuild. Copying only `package.json` and `package-lock.json` first lets Docker reuse the expensive `npm ci` layer during CI/CD builds whenever dependency manifests are unchanged; only the source-copy and later layers need to rebuild. Using `--env-file .env` keeps environment-specific configuration and secrets out of the image layers and repository, so the same image can be promoted across environments with different runtime values. The completed Dockerfile uses `node:20-alpine`, the required manifest-first cache pattern, Prisma Client generation, port exposure, and the specified Node start command.
