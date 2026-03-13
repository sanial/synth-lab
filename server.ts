import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { parseStringPromise } from "xml2js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // arXiv Proxy
  app.get("/api/arxiv", async (req, res) => {
    try {
      const { search_query, start, max_results } = req.query;
      const response = await axios.get("http://export.arxiv.org/api/query", {
        params: {
          search_query,
          start,
          max_results,
        },
      });
      
      const result = await parseStringPromise(response.data);
      res.json(result);
    } catch (error) {
      console.error("arXiv proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from arXiv" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
