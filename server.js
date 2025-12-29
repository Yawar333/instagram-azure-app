const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Create uploads folder if not exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Multer storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// In-memory image list
let images = [];

// Upload image (Creator)
app.post("/upload", upload.single("photo"), (req, res) => {
  const { title, caption, location, people } = req.body;

  const image = {
    id: images.length + 1,
    title,
    caption,
    location,
    people,
    filename: req.file.filename,
    rating: 0,
    comments: [],
  };

  images.push(image);
  res.json({ message: "Image uploaded successfully", image });
});

// View images (Consumer)
app.get("/images", (req, res) => {
  res.json(images);
});

// Comment
app.post("/comment/:id", (req, res) => {
  const image = images.find((i) => i.id == req.params.id);
  if (!image) return res.status(404).send("Image not found");

  image.comments.push(req.body.comment);
  res.send("Comment added");
});

// Rate
app.post("/rate/:id", (req, res) => {
  const image = images.find((i) => i.id == req.params.id);
  if (!image) return res.status(404).send("Image not found");

  image.rating = req.body.rating;
  res.send("Rating updated");
});

// Serve images
app.use("/uploads", express.static("uploads"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
