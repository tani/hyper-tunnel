FROM alpine:latest
RUN apk add --no-cache nodejs
ADD . hyper-tunnel
RUN npm install --production --global ./hyper-tunnel