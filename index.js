const express = require('express');
const app = express();
const PORT = process.env.PORT || 3200;
const path = require('path');

const morgan = require('morgan');
app.use(morgan('morgan:method :url :status :res[content-length] - :response-time ms'));

const cors = require('cors');
app.use(cors());
app.use(express.json());

require("dotenv").config({ path: "./config.env" });

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_PREFIX +
    process.env.MONGODB_USERNAME + ":" +
    process.env.MONGODB_PASSWORD +
    process.env.MONGODB_URL;

const client = new MongoClient(uri);

let db1;

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        db1 = client.db("Lessons");
    } catch (err) {
        console.dir(err);
    }
}

connectToMongoDB();

// GET: Retrieve all lessons
app.get("/lessons", async function(request, response) {
    let collection = db1.collection("Lesson");
    let results = await collection.find({}).toArray();

    response.send(results);
});

// POST: Save a new order
app.post("/orders", async function(request, response) {
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
        return response.status(400).json({
            error: "Order must include lesson IDs and positive quantities."
        });
    }

    try {
        const orderCollection = db1.collection("Orders");

        const result = await orderCollection.insertOne(body);

        response.status(201).send(result);

    } catch (error) {
        console.error(error);

        response.status(500).json({
            error: "Unable to place order."
        });
    }
});


// PUT: Update available lesson spaces
app.put("/lessons/:id", async function(request, response) {
    const id = Number(request.params.id);
    const spaces = request.body.spaces;

    if (!Number.isInteger(spaces) || spaces < 0) {
        return response.status(400).json({
            error: "Spaces must be a valid non-negative integer."
        });
    }

    try {
        const collection = db1.collection("Lesson");

        const result = await collection.updateOne(
            { id: id },
            { $set: { spaces: spaces } }
        );

        if (result.matchedCount === 0) {
            return response.status(404).json({
                error: "Lesson not found."
            });
        }

        response.json({
            message: "Lesson spaces updated successfully."
        });

    } catch (error) {
        console.error(error);

        response.status(500).json({
            error: "Unable to update lesson spaces."
        });
    }
});

app.listen(PORT, function() {
    console.log("App started on port " + PORT);
});