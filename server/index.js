const keys = require('./keys');

// Express App setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')

const app = express(); // receive and response to the react server
app.use(cors()); // allows us to make CORS requests
app.use(bodyParser.json());

// Postgres Client setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    port: keys.pgPort,
    database: keys.pgDatabase,
    password: keys.pgPassword
});

// Create a table for the first time to store all the data
pgClient.on('connect', (client) => {
    client.query('CREATE TABLE IF NOT EXISTS values (number INT)').catch(err => console.log(err));
})

// Redis Client setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 // retry to connect to client every 1s
});

const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi');
});

// take from Postgres
app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows); // .rows ensure we only send in the data that was contained and nothing else that was contain in the values object e.g. query made, time taken
});

// take from Redis
app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => { // look for the hash named 'values'
        res.send(values); 
    })
});

// receive from React
app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 20) { // arbitary set to 20
        return res.status(422).send('Index too high');
    }

    redisClient.hset('values', index, 'Nothing yet!'); // put in a string of 'nothing yet' as the worker will listen to event and write to it later
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]); // store it into postgres too

    res.send({working: true});
});

app.listen(5000, err => {
    console.log('Listening on port 5000, visit at http://localhost:5000');
})