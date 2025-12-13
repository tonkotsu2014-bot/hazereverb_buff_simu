FROM node:20-slim

WORKDIR /app

# Package files are copied strictly for cache usage often, but since we mount everything in dev,
# we rely on the mount. This Dockerfile is mainly for the base image and command.

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
