# IAPShowroom Backend API
This is the main repository for the backend API for the IAP Showroom Project.

## Set Up:

The API uses a Redis database to manage user sessions.

### Install Redis:
`sudo apt install redis`

### Install redis-server:
`sudo apt install redis-server`

To run the redis-server: `redis-server &`

This API uses Express, running on Node.js, version 16.14.0.

### Install Node.js:
`sudo apt install nodejs`
* By default, Ubuntu Node packages are outdated and install version 10. Ensure you upgrade it to version 16 with a NodeSource PPA or nvm:
* https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04

### Install dependencies:
`npm install`

## Run the app:
`npm start`

## Run tests:
Database tests: `npm run testDB`
