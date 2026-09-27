const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../../backend/models/User");

let connectionPromise;

function getDatabaseConnection() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri || !process.env.JWT_SECRET) {
    throw new Error("MONGO_URI (or MONGODB_URI) and JWT_SECRET must be configured");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  }

  return connectionPromise;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function methodNotAllowed(methods) {
  return {
    ...json(405, { message: "Method not allowed" }),
    headers: { "Content-Type": "application/json", Allow: methods.join(", ") },
  };
}

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

function getUserId(event) {
  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET).userId;
  } catch {
    return null;
  }
}

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

module.exports = { User, createToken, getDatabaseConnection, getUserId, json, methodNotAllowed, parseBody };