const express = require('express');
const app = express();
const PORT = process.env.PORT || 3200 ;
const path = require('path');

const morgan = require('morgan');
//app.use(morgan(':method :url'));
app.use(morgan('morgan:method :url :status :res[content-length] - :response-time ms'));

const cors = require('cors');
app.use(cors());
app.use(express.json());

// let myLesson = require('./lesson.js');
// console.log(myLesson);

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

app.post("/names", function(request, response){ 
    const body = request.body; 
    console.log(body); 
    response.json("Name: " + body.firstname + " " + body.lastname + " " + body.telephone); 
});

app.put('/', (req, res) => {
    res.send("This is a PUT request, Let's update an existing order");
});

app.delete('', (req, res) => {
    res.send("This is a DELETE request, Let's delete an existing order");
});

// Sets up the path where your static files are
const publicPath = path.resolve(__dirname, "staticFiles");
// Sends static files from the publicPath directory
app.use("/images", express.static(publicPath));
// If file not found, return error message
app.use("/images", function(request, response){
response.status(404).send("Image not found!");
});

// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}/`);
// });

app.listen(PORT, function() {
console.log("App started on port " + PORT);
});