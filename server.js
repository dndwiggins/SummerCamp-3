const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
console.log("MONGO_CONNECTION_STRING:", process.env.MONGO_CONNECTION_STRING);

if (!process.env.MONGO_CONNECTION_STRING) {
    console.error("Burh");
    process.exit(1);
}

const app = express();
const portNumber = process.argv[2] || 5000;

app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = {
    db: process.env.MONGO_DB_NAME,
    collection: process.env.MONGO_COLLECTION,
};

async function insertDuck(client, databaseAndCollection, newDuck) {
    const result = await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .insertOne(newDuck);
    console.log(`New duck inserted with ID: ${result.insertedId}`);
}

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/random-duck", async (req, res) => {
    const type = req.query.type || "JPG";

    try {
        const response = await fetch(`https://random-d.uk/api/v2/random?type=${type}`);
        const data = await response.json();

        res.render("randomDuck", { url: data.url, message: data.message });
    } catch (error) {
        console.error("Error fetching random duck:", error);
        res.status(500).send("Error fetching random duck");
    }
});


app.post("/save-duck", async (req, res) => {
    const { duckName, duckUrl } = req.body;
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();

        const newDuck = {
            name: duckName,
            url: duckUrl,
            savedAt: new Date(),
        };

        await insertDuck(client, databaseAndCollection, newDuck);

        res.send(`
            <h1>Duck Saved Successfully!</h1>
            <p><strong>Name:</strong> ${duckName}</p>
            <p><strong>Image URL:</strong> <a href="${duckUrl}" target="_blank">${duckUrl}</a></p>
            <a href="/">Home</a>
        `);
    } catch (error) {
        console.error("Error saving duck:", error);
        res.status(500).send("Error saving duck");
    } finally {
        await client.close();
    }
});

app.get("/all-ducks", async (req, res) => {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
        const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);

        const ducks = await collection.find().toArray();
        res.render("allDucks", { ducks });
    } catch (error) {
        console.error("Error fetching ducks:", error);
        res.status(500).send("Error fetching ducks");
    } finally {
        await client.close();
    }
});

app.listen(portNumber, () => {
    console.log(`Server is running at http://localhost:${portNumber}`);
    console.log('Type "stop" to shut down the server.');
});

process.stdin.setEncoding("utf8");
process.stdin.on("readable", function () {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
        const command = dataInput.trim();
        if (command === "stop") {
            console.log("Shutting down the server...");
            process.exit(1);
        } else if (command === "0") {
            console.log("Bye bye");
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`);
        }

        process.stdin.resume();
    }
});


app.use(express.static(path.join(__dirname, "public")));