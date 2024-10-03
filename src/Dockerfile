# use lts so we have libc
FROM node:lts-bullseye

# set env from arg
ARG github_token
ENV GITHUB_TOKEN=$github_token

# change working directory
WORKDIR /opt/collaboration-server

# copy files to /opt/collaboration-server
COPY . ./

# install node packages
RUN apt update && apt install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/* && \
  yarn install --immutable --inline-builds && yarn build

# start collaboration-server
CMD ["yarn", "serve"]
