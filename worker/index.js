// keys host all the require hostnames and ports required to connect to redis
const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 // retry to connect to client every 1s
});

const sub = redisClient.duplicate(); // redis subscription

// Start of worker function
function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
}

sub.on('message', (channel, message) => { // every time we get a new message from redis, run this callback function
    redisClient.hset('values', message, fib(parseInt(message))) // den insert it back into a hash of values, the hash name is also 'values'
}) 

sub.subscribe('insert'); // declare that this subscription only listens to insert events