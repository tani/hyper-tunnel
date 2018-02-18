FROM node
ADD . hyper-tunnel
RUN npm i -g ./hyper-tunnel