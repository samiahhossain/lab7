import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

function signToken(id) {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function setAuthCookie(res, token) {
  const production = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    path: "/",
  });
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const [existing] = await pool.query(
    "SELECT id FROM users WHERE email=?",
    [email]
  );

  if (existing.length) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hash = await bcrypt.hash(password, 10);
  const initials = getInitials(name);

  const [result] = await pool.query(
    "INSERT INTO users (name,email,password,initials) VALUES (?, ?, ?, ?)",
    [name, email, hash, initials]
  );

  const user = {
    id: result.insertId,
    name,
    email,
    initials,
  };

  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const [[user]] = await pool.query(
    "SELECT * FROM users WHERE email=?",
    [email]
  );

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  setAuthCookie(res, signToken(user.id));
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
    }
  });
});


router.post("/logout", (req, res) => {
  const production = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: production ? "none" : "lax",
    secure: production,
    path: "/",
  });

  res.json({ message: "Logged out" });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [[user]] = await pool.query(
      "SELECT id, name, email, initials FROM users WHERE id=?",
      [payload.id]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;