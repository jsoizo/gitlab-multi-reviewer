FROM node:10-alpine

RUN mkdir /app

WORKDIR /app

ADD ./ /app/

RUN npm i

CMD ["npm", "start"]
