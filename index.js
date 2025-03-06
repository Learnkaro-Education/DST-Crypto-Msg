import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/NewMessage.js";
import readline from "readline";
import fs from "fs";
import { config } from "dotenv";
config();


const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

// List of messages to block
const messageNotRequired = [
  "Live trading join kar lo bhailog youtube per search kar lo trading with karol live aapko mil jayega",
  "Live join karlo bhai log",
  "Bhailog finance with karol YouTube channel per live hu main join kar lo",
];

// Add "karol" to the blocked words list
const blockedWords = ["karol", "tradingtechstreet", "live","Not SEBI Registered","Registered","SEBI", "neha"];

let sessionString = process.env.SESSION_KEY;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const client = new TelegramClient(
  new StringSession(sessionString),
  apiId,
  apiHash,
  {
    connectionRetries: 5,
  }
);

(async () => {
  try {
    console.log("Initializing Telegram Client...");

    // Start client if no session string is found
    if (!sessionString) {
      await client.start({
        phoneNumber: async () =>
          new Promise((resolve) =>
            rl.question("Enter your phone number: ", resolve)
          ),
        password: async () =>
          new Promise((resolve) =>
            rl.question("Enter your 2FA password (if enabled): ", resolve)
          ),
        phoneCode: async () =>
          new Promise((resolve) =>
            rl.question("Enter the code you received: ", resolve)
          ),
        onError: (err) => console.error("Login Error:", err),
      });

      // Save the session string to file
      fs.writeFileSync(sessionFilePath, client.session.save(), "utf8");
      console.log("Session string saved to file.");
    } else {
      await client.connect();
    }

    console.log("Connected to Telegram.");

    // Define the source and target channels
    const sourceChannelUsernames = [
      "cryptotwk",
      "tradingtechstreetcryptoforex",
    ]; // Add your two source channels
    const targetChannelId = process
    .env.TARGET_CHANNEL_ID; // Single destination channel

    console.log(
      `Listening for new messages in: ${sourceChannelUsernames.join(", ")}`
    );

    // Fetch the entities for the source channels
    const sourceChannelEntities = await Promise.all(
      sourceChannelUsernames.map((username) => client.getEntity(username))
    );

    client.addEventHandler(async (event) => {
      let message = event.message;

      // Check if the message is from one of the source channels
      const isFromSourceChannel = sourceChannelEntities.some(
        (entity) =>
          message.peerId &&
          message.peerId.channelId &&
          BigInt(message.peerId.channelId) === BigInt(entity.id)
      );

      if (isFromSourceChannel) {
        console.log("New message received from a source channel.");

        // Check if the message contains any blocked words

        const containsBlockedWord = blockedWords.some((word) =>
          message.message.toLowerCase().includes(word.toLowerCase())
        );

        if (containsBlockedWord) {
          console.log(
            "Message contains a blocked word. Skipping this message."
          );
          return;
        }

        // Prepare the forwardable content
        const content = {};
        let urlCheck = "";

        if (message.message) {
          for (let i = 0; i < messageNotRequired.length; i++) {
            if (message.message.includes(messageNotRequired[i])) {
              console.log("Message not required. Skipping this message.");
              return;
            }
          }

          // Replace specific URLs with new ones
          const urlPattern = /https?:\/\/[^\s]+/g;
          const urls = message.message.match(urlPattern);

          if (urls) {
            const cleanedMessage = message.message.replace(
              /https?:\/\/[^\s]+/g,
              (url) => {
                if (url === "https://bit.ly/deltaindiatwk") {
                  urlCheck = "https://india.delta.exchange/?code=PREMIUMFREE";
                  return urlCheck; // Replace with your new bitly URL
                } else if (url === "https://one.exnesstrack.org/a/nfq3du1vw3") {
                  urlCheck =
                    "https://one.exnesstrack.org/boarding/sign-up/a/h62e9ryx9b";
                  return urlCheck;
                } else {
                  return urlCheck;
                }
              }
            );
            if (cleanedMessage.trim() === "" || urlCheck == "") {
              console.log(
                "Message contains unsupported URLs. Skipping this message."
              );
              return;
            }
            content.message = cleanedMessage;
          } else {
            content.message = message.message;
          }
        }

        if (message.media) {
            if (message.media.className === "MessageMediaDocument" && message.media.document.mimeType.startsWith("video/")) {
              console.log("Message contains a video. Skipping this message.");
              return;
            }
          
          if (message.media.constructor.className === "MessageMediaWebPage") {
            const urlPattern = /https?:\/\/[^\s]+/g;
            const urls = message.message.match(urlPattern);

            if (urls) {
              const cleanedMessage = message.message.replace(
                /https?:\/\/[^\s]+/g,
                (url) => {
                  if (url === "https://one.exnesstrack.org/a/nfq3du1vw3") {
                    urlCheck =
                      "https://one.exnesstrack.org/boarding/sign-up/a/h62e9ryx9b";
                    return urlCheck; // Replace with your new bitly URL
                  } else {
                    return urlCheck;
                  }
                }
              );
              if (cleanedMessage.trim() === "" || urlCheck == "") {
                console.log(
                  "Message contains unsupported media URLs. Skipping this message."
                );
                return;
              }
              content.message = cleanedMessage;
            } else {
              content.message = message.message;
            }
          } else {
            content.file = message.media;
          }
        }

        if (!content.message && !content.file) {
          console.log("Skipping message: no content to forward.");
          return;
        }

        // Forward the message to the target channel
        try {
          await client.sendMessage(targetChannelId, content);
          console.log(
            `Message forwarded to target channel: ${targetChannelId}`
          );
        } catch (err) {
          console.error(
            `Failed to forward message to ${targetChannelId}: ${err}`
          );
        }
      }
    }, new NewMessage());

    console.log(
      "Client is now listening for new messages. Press Ctrl+C to exit."
    );
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
})();
