import express from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const [[user]] = await pool.query(
    "SELECT id, name, email, initials FROM users WHERE id=?",
    [req.user.id]
  );

  const [reviews] = await pool.query(`
    SELECT
      r.id,
      r.apt_id AS aptId,
      r.rating,
      r.body,
      r.created AS date,
      a.name AS apartment
    FROM reviews r
    JOIN apartments a ON a.id = r.apt_id
    WHERE r.user_id=?
    ORDER BY r.created DESC
  `, [req.user.id]);

  const [comments] = await pool.query(`
    SELECT
      c.id,
      c.review_id AS reviewId,
      c.body,
      c.created AS date,
      r.apt_id AS aptId,
      a.name AS apartment
    FROM comments c
    JOIN reviews r ON r.id = c.review_id
    JOIN apartments a ON a.id = r.apt_id
    WHERE c.user_id=?
    ORDER BY c.created DESC
  `, [req.user.id]);

  res.json({ user, reviews, comments });
});

export default router;
