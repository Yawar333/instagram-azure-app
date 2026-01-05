const express = require('express');
const multer = require('multer');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// ================= CONFIG =================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(session({
  secret: 'instagram-secret',
  resave: false,
  saveUninitialized: true
}));

// ================= DATA (DEMO) =================
let users = [];     
let images = [];    

// ================= MULTER =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ================= AUTH =================
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// ================= ROUTES =================

// Home
app.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user,
    images: images
  });
});

// Signup
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res) => {
  const { username, password, role } = req.body;
  users.push({ username, password, role });
  res.redirect('/login');
});

// Login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) return res.send('Invalid credentials');

  req.session.user = user;
  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Upload page (Creator only)
app.get('/upload', requireLogin, (req, res) => {
  if (req.session.user.role !== 'creator') {
    return res.send('Only creators can upload images');
  }
  res.render('upload');
});

// Handle upload
app.post('/upload', requireLogin, upload.single('image'), (req, res) => {
  images.push({
    path: '/uploads/' + req.file.filename,
    user: req.session.user.username,
    title: req.body.title,
    caption: req.body.caption,
    location: req.body.location
  });
  res.redirect('/');
});

// ================= SERVER =================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
