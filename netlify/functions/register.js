const bcrypt = require("bcryptjs");
const { User, createToken, getDatabaseConnection, json, methodNotAllowed, parseBody } = require("./_utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return methodNotAllowed(["POST"]);

  try {
    const body = parseBody(event);
    if (!body) return json(400, { message: "Request body must be valid JSON" });
    const username = String(body.username || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (username.length < 3) return json(400, { message: "Username must be at least 3 characters" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { message: "Enter a valid email address" });
    if (password.length < 8) return json(400, { message: "Password must be at least 8 characters" });

    await getDatabaseConnection();
    if (await User.findOne({ email })) {
      return json(409, { message: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, password: passwordHash });
    return json(201, {
      token: createToken(user.id),
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    if (error.code === 11000) return json(409, { message: "An account with that email already exists" });
    console.error(error);
    return json(500, { message: "Something went wrong. Please try again." });
  }
};