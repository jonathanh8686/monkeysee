FROM oven/bun:1 AS base

WORKDIR /app

COPY bun.lockb package.json ./
COPY . .

RUN bun install

RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "start"]

