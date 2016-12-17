FROM node:4.4
EXPOSE 8080
COPY . .
CMD node app.js
