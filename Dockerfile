FROM node
MAINTAINER Masaya TANIGUCHI <asciian@outlook.jp>
RUN npm i -g asciian/noncloud
ENTRYPOINT ["noncloud"]