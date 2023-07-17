FROM node:20-bullseye-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
  curl \
  locales \
  task-japanese \
  && rm -rf /var/lib/apt/lists/*
RUN locale-gen ja_JP.UTF-8
RUN localedef -f UTF-8 -i ja_JP ja_JP
ENV LANG ja_JP.UTF-8
ENV LANGUAGE ja_JP:jp
ENV LC_ALL ja_JP.UTF-8

COPY package.json ./
COPY package-lock.json ./
RUN npm install

CMD node server
