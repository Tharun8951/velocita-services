FROM node:20

MAINTAINER Tharun


COPY package*.json .

RUN npm install

COPY . .


EXPOSE 8081

CMD ["node", "server.js"]
