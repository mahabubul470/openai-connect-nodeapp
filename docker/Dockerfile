FROM node:20.10.0-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

COPY . .

USER node

RUN yarn install

EXPOSE 8080

CMD [ "node", "index.js" ]