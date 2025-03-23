import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import postRoutes from "./src/routes/postRoutes.js";
import Post from "./src/models/Post.js";
import swisseph from "swisseph";
import path from "path";
import { fileURLToPath } from "url";

// Получаем __dirname в ES-модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Указываем путь к файлам эфемерид
const ephemerisPath =
  "E:\\ds-work-it-projects\\backend-projects\\back-hd-first-test-site\\node_modules\\swisseph\\ephe";
swisseph.swe_set_ephe_path(ephemerisPath);

console.log("📂 Путь к эфемеридам:", ephemerisPath);

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000", // разрешаем доступ с фронта на этом порту
    methods: ["GET", "POST", "PUT", "DELETE"], // разрешаем необходимые HTTP методы
  })
);

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find(); // Получаем все посты из базы
    res.json(posts); // Отправляем их в ответ
  } catch (err) {
    res.status(500).json({ message: "Ошибка получения данных" });
  }
});

connectDB();

app.use(express.json());
app.use("/api", authRoutes);

app.use("/api", postRoutes);

app.get("/", (req, res) => {
  res.send("API is running!");
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => console.log(error.message));

app.post("/api/astro", (req, res) => {
  const { date, isRed } = req.body;

  if (
    !date ||
    !date.year ||
    !date.month ||
    !date.day ||
    date.hours === undefined ||
    date.minutes === undefined
  ) {
    return res.status(400).json({ error: "Некорректные данные о дате" });
  }

  // 📌 Переводим дату в Юлианский день
  const jd_ut = swisseph.swe_julday(
    date.year,
    date.month,
    date.day,
    date.hours + date.minutes / 60,
    swisseph.SE_GREG_CAL
  );

  if (isNaN(jd_ut)) {
    return res.status(500).json({ error: "Ошибка вычисления юлианской даты" });
  }

  console.log("🔍 JD (Юлианский день):", jd_ut);

  const planets = [
    { id: swisseph.SE_SUN, name: "Sun" },
    { id: swisseph.SE_MOON, name: "Moon" },
    { id: swisseph.SE_MERCURY, name: "Mercury" },
    { id: swisseph.SE_VENUS, name: "Venus" },
    { id: swisseph.SE_MARS, name: "Mars" },
    { id: swisseph.SE_JUPITER, name: "Jupiter" },
    { id: swisseph.SE_SATURN, name: "Saturn" },
    { id: swisseph.SE_URANUS, name: "Uranus" },
    { id: swisseph.SE_NEPTUNE, name: "Neptune" },
    { id: swisseph.SE_PLUTO, name: "Pluto" },
    { id: swisseph.SE_TRUE_NODE, name: "Rahu" }, // Раху (Северный узел)
  ];

  let results = [];
  let completedRequests = 0;

  let responseSent = false; // ✅ Объявляем переменную перед циклом


  planets.forEach((planet) => {
    swisseph.swe_calc_ut(jd_ut, planet.id, swisseph.SEFLG_SWIEPH, (result) => {
      completedRequests++;

      if (!result || result.error || !result.longitude) {
        console.error(`❌ Ошибка при вычислении ${planet.name}:`, result);
        results.push({ planet: planet.name, degree: null });
      } else {
        // ✅ Получаем долготу (longitude)
        let degree = result.longitude % 360;
        if (degree < 0) degree += 360;

        // ✅ Приводим к диапазону [0, 360]
        if (isNaN(degree)) {
          console.error(
            `❌ Ошибка: некорректное значение для ${planet.name}:`,
            result.longitude
          );
          degree = null;
        } else {
          degree = ((degree % 360) + 360) % 360; // Коррекция отрицательных значений
        }

        results.push({
          planet: planet.name,
          degree: degree !== null ? degree.toFixed(2) : null, // Сохраняем только валидные градусы
        });
      }

      // ✅ Отправляем ответ один раз
      if (completedRequests === planets.length && !responseSent) {
        addDerivedPoints(results, res);
        responseSent = true;
      }
    });
  });
});
/**
 * Функция для добавления Земли (Earth) и Кету (Ketu)
 */
function addDerivedPoints(results, res) {
  if (results.some((p) => p.planet === "Earth")) return; 

  const sun = results.find((p) => p.planet === "Sun");
  const rahu = results.find((p) => p.planet === "Rahu");

  if (sun && sun.degree !== null) {
    let earthDegree = ((parseFloat(sun.degree) + 180) % 360).toFixed(2);
    results.push({ planet: "Earth", degree: earthDegree });
  } else {
    results.push({ planet: "Earth", degree: null });
  }

  if (rahu && rahu.degree !== null) {
    let ketuDegree = ((parseFloat(rahu.degree) + 180) % 360).toFixed(2);
    results.push({ planet: "Ketu", degree: ketuDegree });
  } else {
    results.push({ planet: "Ketu", degree: null });
  }

  console.log("📡 Итоговые расчёты перед отправкой:", results);
  res.json(results);
}
