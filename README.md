# yapper

a chatbot for Bluesky DMs

## Setup

1. Install deps with `pnpm`
2. Add a `.env` file with the following:

```
BSKY_IDENTIFIER=
BSKY_PASSWORD=
OPENAI_API_KEY=
```

Then run `pnpm start` to start the bot.

## Running the Project with Docker

### Build the Docker Image
To build the Docker image, run:
```bash
docker build -t yapper .
```
### Run it
```bash
docker run yapper
```
