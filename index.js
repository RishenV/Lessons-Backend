const express = require('express');
const app = express();
const PORT = process.env.PORT || 3200 ;
const path = require('path');

const morgan = require('morgan');
app.use(morgan('morgan:method :url :status :res[content-length] - :response-time ms'));

const cors = require('cors');
app.use(cors());
app.use(express.json());

require("dotenv").config({ path:"./config.env"});
const { MongoClient } = require("mongodb");
const uri = process.env.MONGODB_PREFIX+
process.env.MONGODB_USERNAME+":"+
process.env.MONGODB_PASSWORD+
process.env.MONGODB_URL;
const client = new MongoClient(uri);

let db1;

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        db1 = client.db("Lessons");
        //return client;
    } catch (err) {
        console.dir(err);
    }
}
connectToMongoDB();

app.get("/lessons", async function(request, response) 
{
  let collection = await db1.collection("Lesson");
  let results = await collection.find({}).toArray(); 
  response.send(results);
});

app.post("/orders", async function(request, response){
var body = request.body;  
let collection = await db1.collection("Orders");
let result = await collection.insertOne(body);
response.send(result);
});


app.listen(PORT, function() {
console.log("App started on port " + PORT);
});