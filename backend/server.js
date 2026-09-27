const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");

const app = express();
const port = Number(process.env.PORT) || 5000;

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  throw new Error("MONGODB_URI and JWT_SECRET must be set in backend/.env");
}

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, password: passwordHash });

    return res.status(201).json({
      token: createToken(user.id),
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json({
      token: createToken(user.id),
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/me/shows", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("shows");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ shows: user.shows || [] });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/me/shows", requireAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.shows)) {
      return res.status(400).json({ message: "shows must be an array" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { shows: req.body.shows },
      { new: true, runValidators: true, projection: "shows" },
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ shows: user.shows || [] });
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "An account with that email already exists" });
  }

  console.error(error);
  return res.status(500).json({ message: "Something went wrong. Please try again." });
});

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    app.listen(port, () => {
      console.log(`BingeTrack API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
