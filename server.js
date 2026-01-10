const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(
  session({
    secret: "snapverse-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true only if HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 1 day session
    },
  })
);

/* ---------- View Engine ---------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ---------- Fake Users (in-memory) ---------- */
const users = []; // { username, password, role }

/* ---------- File Upload (LOCAL STORAGE) ---------- */
const storage = multer.diskStorage({
  destination: "public/uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

/* ---------- In-memory posts ---------- */
const images = []; // { path, user, caption }

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

  req.session.user = { username, role };
  res.redirect("/");
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

  if (!user) return res.send("Invalid login");

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

// Upload image (LOCAL)
app.post("/upload", upload.single("photo"), (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const { caption } = req.body;

  if (!req.file) return res.send("No file uploaded");

  images.push({
    path: "/uploads/" + req.file.filename,
    user: req.session.user.username,
    caption: caption,
  });

  res.redirect("/");
});

/* ---------- Start Server ---------- */
app.listen(PORT, () => {
  console.log(`SnapVerse running on port ${PORT}`);
});
