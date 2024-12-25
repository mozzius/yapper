FROM node:18
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN [ -f tsconfig.json ] && pnpm build || echo "No tsconfig.json found, skipping build step"
EXPOSE 3000
CMD ["pnpm", "start"]
