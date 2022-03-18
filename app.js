var config = require('./Config/config.js');
// var authEndpoints = require('./Endpoints/Authentication/AuthEndpoints.js');

const express = require('express');
const app = express();
const port = config.PORT;

//use function to pass app object so it can be bound to the method functions within each endpoints file

//use app.use function to attach auth middleware that parses through the headers of all incoming requests

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`IAP Showroom API listening on port ${port}`);
})