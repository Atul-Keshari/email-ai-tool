"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const oauth2Client = new googleapis_1.google.auth.OAuth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
});
oauth2Client.setCredentials({
    access_token: process.env.ACCESS_TOKEN,
    refresh_token: process.env.REFRESH_TOKEN,
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose",
});
const gmail = googleapis_1.google.gmail({ version: "v1", auth: oauth2Client });
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function listEmails() {
    try {
        const response = await gmail.users.messages.list({
            userId: "me",
            maxResults: 2,
        });
        const messages = response.data.messages;
        if (messages) {
            const messageIds = messages.map((message) => message.id);
            for (const messageId of messageIds) {
                const email = await gmail.users.messages.get({
                    userId: "me",
                    id: messageId,
                });
                const messagePayload = email.data.payload;
                if (messagePayload) {
                    const parts = messagePayload.parts;
                    if (parts) {
                        for (const part of parts) {
                            if (part.mimeType === "text/plain" &&
                                part.body &&
                                part.body.size) {
                                const decodedBody = Buffer.from(part.body.data, "base64").toString();
                                // Extract user email from the email headers
                                const headers = messagePayload.headers;
                                let userEmail = "";
                                if (headers) {
                                    const fromHeader = headers.find((header) => header.name === "From");
                                    if (fromHeader && fromHeader.value) {
                                        // Check if fromHeader.value is not null or undefined
                                        const match = fromHeader.value.match(/<([^>]+)>/);
                                        if (match) {
                                            userEmail = match[1];
                                        }
                                    }
                                }
                                // async function response(): Promise<string> {
                                //   const completion = await openai.chat.completions.create({
                                //     messages: [
                                //       {
                                //         role: "system",
                                //         content: `Generate an email based on the context given that whether the client is interested, not interested, or needs more information. Context: ${decodedBody}`,
                                //       },
                                //     ],
                                //     model: "gpt-3.5-turbo",
                                //   });
                                //   return completion.choices[0].message.content!;
                                // }
                                // const responseEmail = await response();
                                // Since my api is giving full quota used in api response thats why i'm using the below code to actually so the working that my code can send email response automatically
                                const clientResponse = getClientResponse('interested');
                                await sendResponseEmail(userEmail, clientResponse);
                            }
                        }
                    }
                }
            }
        }
        else {
            console.log("No messages found.");
        }
    }
    catch (error) {
        console.error("Error fetching emails:", error);
    }
}
// My openai api is showing no quota left thats why i'm using below static response function
function getClientResponse(openaiOutput) {
    if (openaiOutput.includes("interested")) {
        return "Thank you for your interest! We're glad to hear that you're interested. How can we assist you further?";
    }
    else if (openaiOutput.includes("not interested")) {
        return "Thank you for considering our services/products. If you have any feedback on why you're not interested, we'd love to hear it.";
    }
    else {
        return "Thank you for reaching out. We're happy to provide more information if needed. What specific details would you like to know?";
    }
}
async function sendResponseEmail(userEmail, response) {
    try {
        const emailLines = [
            `From: Your Name <your-email@gmail.com>`,
            `To: ${userEmail}`,
            `Subject: Response to Your Inquiry`,
            ``,
            `${response}`,
        ];
        const email = emailLines.join("\n");
        await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: Buffer.from(email).toString("base64"),
            },
        });
        console.log("Response email sent to:", userEmail);
    }
    catch (error) {
        console.error("Error sending response email:", error);
    }
}
listEmails();
