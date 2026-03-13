require("dotenv").config();
const express = require("express");
const { getCourses, getAssignments, getGrades, getUpcoming } = require("./canvas-client");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

app.get("/api/courses", async (req, res) => {
  try {
    res.json(await getCourses());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/courses/:id/assignments", async (req, res) => {
  try {
    res.json(await getAssignments(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/courses/:id/grades", async (req, res) => {
  try {
    res.json(await getGrades(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/upcoming", async (req, res) => {
  try {
    res.json(await getUpcoming());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
