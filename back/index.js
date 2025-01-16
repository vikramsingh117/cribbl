const api = require("./api");
const prompt = require("prompt");
const { t1 } = require("@mtproto/core");
const express = require("express");
const app = express();
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const cookieParser = require("cookie-parser");

// In-memory store for unique user IDs  
let uniqueUsers = new Set();

app.use(
  cors({
    origin: ["http://localhost:5173","http://localhost:8080"], // Frontend origin
    credentials: true, // Allow cookies and other credentials
  })
);

app.use(cookieParser());

app.use((req, res, next) => {
  let userId = req.cookies.userId;
  console.log({ userId }, req.cookie);

  if (!userId) {
    userId = uuidv4();
    res.cookie("userId", userId, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });
  }

  // Add the user ID to the set if it's not already present
  uniqueUsers.add(userId);
  next();
});

// Endpoint to get the count of unique users
app.get("/uniqueUserCount", (req, res) => {
  res.json({ count: uniqueUsers.size });
});

// Fetch user details
async function getUser() {
  console.log("personal log API_ID:", process.env.API_ID);
  console.log("personal log API_HASH:", process.env.API_HASH);

  try {
    const user = await api.call("users.getFullUser", {
      id: { _: "inputUserSelf" },
    });
    return user;
  } catch (error) {
    return null;
  }
}

// Sign in using phone code
function signIn({ code, phone, phone_code_hash }) {
  return api
    .call("auth.signIn", {
      phone_code: code,
      phone_number: phone,
      phone_code_hash: phone_code_hash,
    })
    .then((v) => {
      console.log("LOGIN SUCCESS: ", v);
      return v;
    })
    .catch((e) => {
      console.log("LOGIN FAIL: ", e);
      throw e;
    });
}

// Send verification code to phone number
function sendCode(phone) {
  console.log("personal log, phone", phone);
  return api.call("auth.sendCode", {
    phone_number: phone,
    settings: { _: "codeSettings" },
  });
}

// Helper function to handle flood wait errors
async function callApiWithRetry(method, params) {
  while (true) {
    try {
      return await api.call(method, params);
    } catch (error) {
      if (
        error.error_message &&
        error.error_message.startsWith("FLOOD_WAIT_")
      ) {
        const waitTime = parseInt(error.error_message.split("_")[2], 10);
        console.log(`Flood wait for ${waitTime} seconds`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      } else {
        throw error;
      }
    }
  }
}

// Helper function to add a delay
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main script execution
app.use(express.json()); // Middleware to parse JSON requests





app.post("/telegram", async (req, res) => {
  const { phone, code, phoneCodeHash } = req.body;

  try {
    const user = await getUser();
    console.log("personal log, user should be undefined", user);

    if (!user) {
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Step 1: Send code if no code is provided
      if (!code) {
        const { phone_code_hash } = await sendCode(phone);
        console.log("personal log, phone_code_hash", phone_code_hash);
        return res.json({
          message: "Code sent to phone",
          phoneCodeHash: phone_code_hash,
        });
      }

      // Step 2: Sign in with code and phone_code_hash
      if (!phoneCodeHash) {
        return res
          .status(400)
          .json({ error: "phoneCodeHash is required for verification" });
      }

      try {
        const signInResult = await signIn({ code, phone, phone_code_hash: phoneCodeHash });

        if (signInResult._ === "auth.authorizationSignUpRequired") {
          return res
            .status(401)
            .json({ error: "Sign-up required for this phone number" });
        }
      } catch (error) {
        if (error.error_message !== "SESSION_PASSWORD_NEEDED") {
          console.log(`error:`, error);
          return res.status(500).json({ error: error.message });
        }
        // Handle 2FA here if needed
      }
    }

    // Resolve the channel username
    const resolvedPeer = await callApiWithRetry("contacts.resolveUsername", {
      username: "@seedifyfundofficial",
    });

    const channel = resolvedPeer.chats.find(
      (chat) => chat.id === resolvedPeer.peer.channel_id
    );

    const inputPeer = {
      _: "inputPeerChannel",
      channel_id: channel.id,
      access_hash: channel.access_hash,
    };

    const LIMIT_COUNT = req.query.limit ? parseInt(req.query.limit) : 100;
    const allMessages = [];
    const firstHistoryResult = await callApiWithRetry("messages.getHistory", {
      peer: inputPeer,
      limit: LIMIT_COUNT,
    });

    const historyCount = firstHistoryResult.count;

    // Fetch message history in chunks with delay
    for (let offset = 0; offset < 300; offset += 100) {
      try {
        const history = await callApiWithRetry("messages.getHistory", {
          peer: inputPeer,
          add_offset: offset,
          limit: 50,
        });

        for (let i of history.messages) {
          if (i.message != "") {
            console.log("chats", i);
            for (let j of history.users) {
              if (i.from_id && i.message != "") {
                if (i.from_id.user_id == j.id) {
                  allMessages.push({
                    message: i.message,
                    username: j?.username,
                    firstName: j.first_name,
                    lastName: j.last_name,
                  });
                }
              }
            }
          }
        }
        // Add delay between fetches to avoid rate limiting
        await delay(1000); // Delay of 1 second (1000 milliseconds)
      } catch (error) {
        console.log("Error fetching message history:", error);
        break; // Exit the loop if there is an error
      }
    }

    res.json(allMessages);
  } catch (error) {
    console.error("Error in /telegram route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3010);
