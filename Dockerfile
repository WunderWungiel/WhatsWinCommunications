FROM ubuntu:noble
WORKDIR /app
RUN apt update && \
  apt install -y nodejs npm git && \
  npm install --global yarn
COPY . .
RUN yarn
CMD ["yarn", "build:run"]
