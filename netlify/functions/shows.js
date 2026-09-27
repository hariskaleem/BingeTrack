const { User, getDatabaseConnection, getUserId, json, methodNotAllowed, parseBody } = require("./_utils");

exports.handler = async (event) => {
  if (!["GET", "PUT"].includes(event.httpMethod)) return methodNotAllowed(["GET", "PUT"]);

  const userId = getUserId(event);
  if (!userId) return json(401, { message: "Authentication required" });

  try {
    await getDatabaseConnection();
    if (event.httpMethod === "GET") {
      const user = await User.findById(userId).select("shows");
      if (!user) return json(404, { message: "User not found" });
      return json(200, { shows: user.shows || [] });
    }

    const body = parseBody(event);
    if (!body || !Array.isArray(body.shows)) return json(400, { message: "shows must be an array" });
    const user = await User.findByIdAndUpdate(
      userId,
      { shows: body.shows },
      { new: true, runValidators: true, projection: "shows" },
    );
    if (!user) return json(404, { message: "User not found" });
    return json(200, { shows: user.shows || [] });
  } catch (error) {
    console.error(error);
    return json(500, { message: "Something went wrong. Please try again." });
  }
};