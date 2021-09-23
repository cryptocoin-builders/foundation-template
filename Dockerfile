FROM node:12.16.1 AS builder
ENV SERVICE_NAME CHANGE ME
LABEL maintainer="CHANGE ME"
ARG environment

RUN apt-get update
RUN apt-get install -y build-essential libsodium-dev libboost-system-dev

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .
RUN mv /configs/$environment/config.js /configs/main/config.js
RUN cp /configs/$environment/* /configs/pools/

# List of Ports in Use
# CHANGE ME
EXPOSE 3002

ENTRYPOINT npm start
