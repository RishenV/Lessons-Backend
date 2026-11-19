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
  const body = request.body;
  const lessons = body && body.lessons;

  if (
    !Array.isArray(lessons) ||
    lessons.length === 0 ||
    lessons.some(item =>
      !item ||
      item.id === undefined ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    )
  ) {
    return response.status(400).json({ error: "Order must include lesson IDs and positive quantities." });
  }

  let session;
  try {
    const lessonCollection = db1.collection("Lesson");
    const orderCollection = db1.collection("Orders");
    session = client.startSession();

    let result;

    await session.withTransaction(async function(){
      for (const item of lessons) {
        const update = await lessonCollection.updateOne(
          { id: item.id, spaces: { $gte: item.quantity } },
          { $inc: { spaces: -item.quantity } },
          { session }
        );

        if (update.matchedCount !== 1) {
          const error = new Error("Lesson is missing or does not have enough spaces.");
          error.code = "INSUFFICIENT_SPACES";
          throw error;
        }
      }

      result = await orderCollection.insertOne(body, { session });
    });

    response.status(201).send(result);
  } catch (error) {
    console.error(error);
    if (error.code === "INSUFFICIENT_SPACES") {
      return response.status(409).json({ error: error.message });
    }
    response.status(500).json({ error: "Unable to place order." });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

app.listen(PORT, function() {
console.log("App started on port " + PORT);
});