import request from "supertest";
import app from "../app.js";

describe("Apartments API", () => {

  test("GET /api/apartments returns 200", async () => {

    const response = await request(app)
      .get("/api/apartments");

    expect(response.status).toBe(200);
  });

  test("POST review without token returns 401", async () => {

    const response = await request(app)
      .post("/api/apartments/1/reviews")
      .send({
        rating: 5,
        body: "Nice apartment"
      });

    expect(response.status).toBe(401);
  });

});