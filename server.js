const express = require("express");
const session = require("express-session");
const path = require("path");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.warn("WARNING: AZURE_STORAGE_CONNECTION_STRING is not set. File uploads will fail.");
}

/* ---------- Middleware ---------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "instagram-secret",
    resave: false,
    saveUninitialized: false,
  })
);

/* ---------- View Engine ---------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ---------- Fake Users (in-memory) ---------- */
const users = []; // { username, password, role }

/* ---------- File Upload (Multer & Azure) ---------- */
// Use memoryStorage so we get the file buffer to send to Azure
const storage = multer.memoryStorage();
const upload = multer({ storage });

async function uploadToAzure(fileBuffer, fileName, mimeType) {
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error("Azure Storage Connection String is missing.");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  const containerName = "uploads";
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Create container if it doesn't exist
  await containerClient.createIfNotExists({
    access: "blob", // allow public read access to blobs
  });

  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });

  return blockBlobClient.url;
}

/* ---------- In-memory posts ---------- */
const images = [];
// Each post: { path, user, caption, likes, comments: [] }

/* ---------- Routes ---------- */

// Home / Feed
app.get("/", (req, res) => {
  res.render("index", {
    user: req.session.user,
    images: images,
  });
});

// Signup (GET)
app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

// Signup (POST)
app.post("/signup", (req, res) => {
  const { username, password, role } = req.body;

  if (users.find(u => u.username === username)) {
    return res.render("signup", { error: "Username already taken" });
  }

  users.push({ username, password, role });

  // Auto login
  req.session.user = { username, role };

  res.redirect("/");
});

// Login (GET)
app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Login (POST)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) return res.render("login", { error: "Invalid username or password" });

  req.session.user = {
    username: user.username,
    role: user.role,
  };

  res.redirect("/");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Upload page (GET) — ROLE PROTECTED
app.get("/upload", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  if (req.session.user.role === "consumer") {
    // Ideally this shouldn't be reached if UI hides the button, but good for safety
    return res.redirect("/");
  }

  res.render("upload", { user: req.session.user });
});

// Upload image (POST) — ROLE PROTECTED
app.post("/upload", upload.single("photo"), async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  if (req.session.user.role === "consumer") {
    return res.status(403).send("Consumers are not allowed to upload photos.");
  }

  const { caption } = req.body;

  if (!req.file) return res.send("No file uploaded");

  try {
    const fileName = Date.now() + "-" + req.file.originalname;
    const azureUrl = await uploadToAzure(req.file.buffer, fileName, req.file.mimetype);

    images.push({
      path: azureUrl,
      user: req.session.user.username,
      caption: caption,
      likes: 0,
      comments: [],
    });

    res.redirect("/");
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Failed to upload image. " + err.message);
  }
});

/* ---------- LIKE POST ---------- */
app.post("/like/:id", (req, res) => {
  const id = parseInt(req.params.id);
  if (images[id]) images[id].likes++;
  res.redirect("/");
});

/* ---------- COMMENT POST ---------- */
app.post("/comment/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { comment } = req.body;

  if (images[id] && comment.trim() !== "") {
    images[id].comments.push({
      user: req.session.user.username,
      text: comment,
    });
  }

  res.redirect("/");
});

/* ---------- Start Server ---------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
