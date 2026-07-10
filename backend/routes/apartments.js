import express from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const apartmentExtras = {
  1: {
    description: "Mid-rise apartment complex near Point Pleasant Park.",
    img: "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=640&h=300&fit=crop",
  },
  2: {
    description: "High-rise tower in a quiet residential neighbourhood.",
    img: "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=640&h=300&fit=crop",
  },
  3: {
    description: "Halifax's tallest residential building in the downtown core.",
    img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=640&h=300&fit=crop",
  },
  4: {
    description: "Modern low-rise near Victoria Park.",
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=640&h=300&fit=crop",
  },
  5: {
    description: "New construction with modern amenities.",
    img: "https://images.unsplash.com/photo-1555636222-cae831e670b3?w=640&h=300&fit=crop",
  },
};

function withExtras(apt) {
  return {
    ...apt,
    ...apartmentExtras[apt.id],
  };
}

router.get("/", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT a.*,
      ROUND(AVG(r.rating),1) AS rating,
      COUNT(r.id) AS reviews
    FROM apartments a
    LEFT JOIN reviews r ON r.apt_id = a.id
    GROUP BY a.id
  `);

  res.json(rows.map(withExtras));
});

router.get("/:id", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM apartments WHERE id=?",
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Apartment not found" });
  }

  res.json(withExtras(rows[0]));
});

router.get("/:id/reviews", async (req, res) => {
  const [reviews] = await pool.query(`
    SELECT
      r.id,
      r.apt_id AS aptId,
      r.user_id AS userId,
      r.rating,
      r.body,
      r.created AS date,
      u.name AS author,
      u.initials,
      COUNT(c.id) AS commentCount
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN comments c ON c.review_id = r.id
    WHERE r.apt_id=?
    GROUP BY r.id
    ORDER BY r.created DESC
  `, [req.params.id]);

  res.json(reviews);
});

router.get("/:id/comments", async (req, res) => {
  const [comments] = await pool.query(`
    SELECT
      c.id,
      c.review_id AS reviewId,
      c.user_id AS userId,
      c.body,
      c.created AS date,
      u.name AS author,
      u.initials
    FROM comments c
    JOIN reviews r ON r.id = c.review_id
    JOIN users u ON u.id = c.user_id
    WHERE r.apt_id=?
    ORDER BY c.created ASC
  `, [req.params.id]);

  res.json(comments);
});

router.post("/:id/reviews", auth, async (req, res) => {
  const { rating, body } = req.body;

  if (rating == null || !body) {
    return res.status(400).json({ error: "Rating and body are required" });
  }

  await pool.query(
    `INSERT INTO reviews
      (apt_id, user_id, rating, body, created)
      VALUES (?, ?, ?, ?, CURDATE())`,
    [req.params.id, req.user.id, rating, body]
  );

  res.status(201).json({ message: "Review added" });
});

router.post("/:aptId/reviews/:reviewId/comments", auth, async (req, res) => {
  const { body } = req.body;

  if (!body) {
    return res.status(400).json({ error: "Body is required" });
  }

  await pool.query(
    `INSERT INTO comments
      (review_id, user_id, body, created)
      VALUES (?, ?, ?, CURDATE())`,
    [req.params.reviewId, req.user.id, body]
  );

  res.status(201).json({ message: "Comment added" });
});

router.put("/reviews/:id", auth, async (req, res) => {
  const [[review]] = await pool.query(
    "SELECT user_id FROM reviews WHERE id = ?",
    [req.params.id]
  );

  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  if (review.user_id !== req.user.id) {
    return res.status(403).json({ error: "Not your review" });
  }

  const { rating, body } = req.body;

  await pool.query(
    "UPDATE reviews SET rating=?, body=? WHERE id=?",
    [rating, body, req.params.id]
  );

  res.json({ message: "Review updated" });
});

router.delete("/reviews/:id", auth, async (req, res) => {
  const [[review]] = await pool.query(
    "SELECT user_id FROM reviews WHERE id=?",
    [req.params.id]
  );

  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  if (review.user_id !== req.user.id) {
    return res.status(403).json({ error: "Not your review" });
  }

  await pool.query(
    "DELETE FROM reviews WHERE id=?",
    [req.params.id]
  );

  res.json({ message: "Review deleted" });
});

export default router;
