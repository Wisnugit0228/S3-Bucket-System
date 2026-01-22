import express from "express";
import dotenv from "dotenv";
dotenv.config();
import router from "./src/routes/index.route.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const port = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "*",
  }),
);
app.use(cookieParser());

app.use(router);

//app.listen(port, () => console.log(`server running on port ${port}`));

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
