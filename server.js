const express = require("express");
const session = require("express-session");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

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

/* ---------- File Upload (Multer) ---------- */
const storage = multer.diskStorage({
  destination: "public/uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

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
  res.render("signup");
});

// Signup (POST)
app.post("/signup", (req, res) => {
  const { username, password, role } = req.body;

  users.push({ username, password, role });

  res.redirect("/login");
});

// Login (GET)
app.get("/login", (req, res) => {
  res.render("login");
});

// Login (POST)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.send("Invalid login");
  }

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

// Upload page (GET)
app.get("/upload", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("upload", { user: req.session.user });
});

// Upload image (POST)
app.post("/upload", upload.single("photo"), (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const { caption } = req.body;

  if (!req.file) {
    return res.send("No file uploaded");
  }

  images.push({
    path: "/uploads/" + req.file.filename,
    user: req.session.user.username,
    caption: caption,
    likes: 0,
    comments: [],
  });

  res.redirect("/");
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
