# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the Lilith Discord bot and supporting API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (lib/db) + raw pg (Lilith)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for api-server)
- **Discord**: discord.js v14, @discordjs/voice, play-dl
- **AI**: OpenAI GPT-4o (chat, task, TTS, image generation)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   ├── mockup-sandbox/     # Component preview sandbox
│   └── lilith/             # Lilith Discord bot (MAIN BOT)
│       └── src/
│           ├── index.ts              # Bot entry point, command registration
│           ├── lib/
│           │   ├── db.ts             # PostgreSQL connection, user_relations, guild_settings
│           │   ├── ai.ts             # OpenAI GPT-4o chat, TTS
│           │   ├── music.ts          # Voice/music queue management
│           │   └── constants.ts      # OWNER_ID, Lilith system prompt, drug responses
│           ├── commands/
│           │   ├── core/             # /status /help /mood /annoyance /affinity
│           │   ├── ai/               # /ask /task /nsfwtoggle /google
│           │   ├── interaction/      # /punch /slap /bite /headbutt /stab /shoot /insult /pickup /ship /smash /blow
│           │   ├── moderation/       # /ban /kick /warn /timeout /rename /makerole /editrole /deleterole /purge /channel /avatar /banner /info /autoreact /autoreply
│           │   ├── fun/              # /hitsmeth /hitsweed /chugsdrink /popspill
│           │   ├── generation/       # /create /tts
│           │   └── vc/               # /join /leave /play /pause /resume /skip /stop /queue /vcmove /vcmute /vcunmute /vcdeafen /vcundeafen
│           └── events/
│               ├── ready.ts          # Bot ready handler, rotating status
│               ├── messageCreate.ts  # Auto-react, auto-reply
│               └── interactionCreate.ts # Slash command dispatch, blacklist check
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Lilith Bot Features

### Personality System
- **Owner**: tweakbrazy (ID: 1152706771044028587) — absolute loyalty, warm treatment
- **Affinity**: -100 to +100, stored per user in PostgreSQL
- **Annoyance**: 0 to 100, stored per user in PostgreSQL
- **Blacklist**: Users who target Lilith with NSFW commands twice get blacklisted permanently
- **NSFW incident tracking**: Owner notified via DM on incidents

### Database Tables
- `user_relations` — affinity, annoyance, blacklisted, nsfw_incident_count per user
- `guild_settings` — nsfw_enabled, nsfw_channels per guild
- `autoreacts` — trigger → emoji mappings per guild
- `autoreplies` — trigger → reply mappings per guild
- `warnings` — warning records per guild+user

### Environment Variables Required
- `DISCORD_TOKEN` — Discord bot token
- `OPENAI_API_KEY` — OpenAI API key for GPT-4o, TTS, DALL-E 3
- `DATABASE_URL` — PostgreSQL (provisioned by Replit)

## Workflows

- `Lilith Discord Bot` — `pnpm --filter @workspace/lilith run dev`
- `artifacts/api-server: API Server` — Express API
- `artifacts/mockup-sandbox: Component Preview Server` — Design mockup sandbox

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
