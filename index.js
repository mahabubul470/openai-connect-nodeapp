// Import necessary modules and libraries
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const Markdown = require('markdown-it');
const md = Markdown();
require('dotenv').config();

// Create an Express application
const app = express();

// Set the port for the server to run on, defaulting to 8000
const port = process.env.PORT || 8000;

// Retrieve necessary environment variables
const openAiKey = process.env.GPT_API_KEY;
// const assistant = process.env.GPT_ASSISTANT_ID;
const allowedDomain = process.env.DOMAIN_ALLOWED;

// Initialize OpenAI API with the provided key
const openai = new OpenAI({ apiKey: openAiKey });


// Enable Cross-Origin Resource Sharing (CORS) for the specified domain
var corsOptions = {
    origin: function (origin, callback) {
        if (allowedDomain.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error(`The request from ${origin} is not allowed.`))
        }
    }
}

app.use(cors(corsOptions))


// Middleware to re-validate the origin of incoming requests
app.use((req, res, next) => {
    // Block requests from disallowed origins
    const origin = req.headers.origin;
    // Check if the request does not have a valid origin (not present) or is not from an allowed domain.
    if (!origin || !allowedDomain.includes(origin)) {
        // If the request does not have a valid origin or is not from an allowed domain,
        // respond with a 403 Forbidden status and an error message indicating the disallowed origin.
        return res.status(403).send(`The request from ${origin} is not allowed.`);
    }

    // Set the Access-Control-Allow-Origin header to the requested origin,
    // allowing cross-origin requests from the specified domains.
    res.header("Access-Control-Allow-Origin", origin);

    // Continue to the next middleware or route handler in the Express pipeline.
    next();
});


// Parse incoming JSON requests
app.use(express.json());

// Endpoint to create a new chat thread
app.post("/node-api/chats", async (req, res) => {
    // Create a new chat thread using OpenAI API and send the response
    res.send(await openai.beta.threads.create())
});

// Endpoint to handle user questions within a specific chat thread
app.post("/node-api/chats/:assistant/:threadID/:message", async (req, res) => {
    const { threadID, message, assistant } = req.params;
    // Add user's question to the chat thread
    await openai.beta.threads.messages.create(threadID, {
        role: "user",
        content: message,
    });
    // Run the chat thread and wait for a response
    const run = await openai.beta.threads.runs.create(threadID, { assistant_id: assistant });

    let response;
    // Retrieve and send the assistant's response
    do {
        response = await openai.beta.threads.runs.retrieve(threadID, run.id);
        await new Promise(resolve => setTimeout(resolve, parseInt(process.env.GPT_RUN_SLEEP || 10) * 1000));
    } while (response.status === 'queued' || response.status === 'in_progress');

    const messages = await openai.beta.threads.messages.list(threadID);
    if (messages.data && messages.data.length > 0) {
        let data = messages.data[0].content[0].text.value;
        data = data.trim()
        res.send(md.render(data));
    } else {
        res.status(404).send("No response received");
    }
});

// Start the Express server on the specified port
app.listen(port, () => { console.log(`openai-connect-node-app is running on port: ${port}`) });

