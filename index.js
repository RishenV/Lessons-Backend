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

// POST: Place a new order
app.post("/orders", async function(request, response) {
    const body = request.body;
    const lessons = body && body.lessons;

    // Validate order
    if (
        !Array.isArray(lessons) ||
        lessons.length === 0 ||
        lessons.some(item =>
            !item ||
            !Number.isInteger(Number(item.id)) ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        )
    ) {
        return response.status(400).json({
            error: "Order must contain valid lesson IDs and quantities."
        });
    }

    // Combine duplicate lesson IDs
    const quantities = {};

    for (const item of lessons) {
        const id = Number(item.id);
        quantities[id] = (quantities[id] || 0) + item.quantity;
    }

    const lessonCollection = db1.collection("Lesson");
    const orderCollection = db1.collection("Orders");

    const updatedLessons = [];

    try {
        // Reduce spaces for each lesson
        for (const id in quantities) {
            const quantity = quantities[id];

            const result = await lessonCollection.updateOne(
                {
                    id: Number(id),
                    spaces: { $gte: quantity }
                },
                {
                    $inc: { spaces: -quantity }
                }
            );

            if (result.modifiedCount === 0) {
                throw new Error(
                    "Not enough spaces available for lesson " + id
                );
            }

            updatedLessons.push({
                id: Number(id),
                quantity: quantity
            });
        }

        // Save order in MongoDB
        const result = await orderCollection.insertOne(body);

        response.status(201).json({
            message: "Order saved and lesson spaces updated successfully.",
            orderId: result.insertedId
        });

    } catch (error) {

        // Restore spaces if an error occurs
        for (const item of updatedLessons) {
            await lessonCollection.updateOne(
                { id: item.id },
                { $inc: { spaces: item.quantity } }
            );
        }

        console.error(error);

        response.status(400).json({
            error: error.message || "Unable to place order."
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