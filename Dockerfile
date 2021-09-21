FROM node:12.16.1 AS deps
ENV SERVICE_NAME CHANGE ME
LABEL maintainer="CHANGE ME"

COPY package.json ./
COPY package-lock.json ./
RUN npm install

FROM node:12.16.1 AS builder
ARG environment

COPY . .
COPY --from=deps /node_modules ./node_modules
COPY --from=deps /package.json ./package.json
RUN cp /configs/$environment/* /configs/pools/

# List of Ports in Use
# CHANGE ME
EXPOSE 3001

ENTRYPOINT npm start
