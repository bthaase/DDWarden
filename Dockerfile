# Dockerfile
# using debian:jessie for it's smaller size over ubuntu
FROM debian:jessie

# Replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Set environment variables
ENV appDir /var/www/app/current

# Run updates and install deps
RUN apt-get update

RUN apt-get install -y -q --no-install-recommends \
    apt-transport-https \
    build-essential \
    ca-certificates \
    curl \
    g++ \
    gcc \
    git \
    make \
    nginx \
    sudo \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get -y autoclean

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 6.3.1

# Install nvm with node and npm
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.29.0/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# Set up our PATH correctly so we don't have to long-reference npm, node, &c.
ENV NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Set the work directory
RUN mkdir -p /var/www/app/current
WORKDIR ${appDir}

# Clone the DDWarden application from Github.
RUN git clone git://github.com/bthaase/DDWarden.git

# Install our NPM modules from package.json
RUN npm i --production

# Install forever so we can run our application
RUN npm i -g forever

# Add volumes
RUN mkdir /database
VOLUME /database

# Expose the ports
EXPOSE 2055
EXPOSE 2056
EXPOSE 8020

# Override Warden's database path with an environment variable.
ENV DDWARDEN_DATABASE /database/ddwarden.db

# Start the DDWarden Application with Forever.
ENTRYPOINT ["forever", "/var/www/app/current/index.js"]