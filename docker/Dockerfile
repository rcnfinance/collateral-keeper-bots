FROM node:10-alpine AS BUILD_IMAGE

RUN apk update && apk add python make g++ && rm -rf /var/cache/apk/*

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install --only=production

COPY . .

FROM node:10-alpine

WORKDIR /usr/src/app

COPY --from=BUILD_IMAGE /usr/src/app/ ./

ENTRYPOINT [ "node", "index.js" ]