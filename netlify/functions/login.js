const bcrypt = require("bcryptjs");
const { User, createToken, getDatabaseConnection, json, methodNotAllowed, parseBody } = require("./_utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return methodNotAllowed(["POST"]);

  try {
    const body = parseBody(event);
    if (!body) return json(400, { message: "Request body must be valid JSON" });
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    await getDatabaseConnection();
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return json(401, { message: "Invalid email or password" });
    }

    return json(200, {
      token: createToken(user.id),
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error(error);
    return json(500, { message: "Something went wrong. Please try again." });
  }
};