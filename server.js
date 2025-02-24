import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import postRoutes from './src/routes/postRoutes.js';
import Post from './src/models/Post.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000', // разрешаем доступ с фронта на этом порту
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // разрешаем необходимые HTTP методы
}));

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find();  // Получаем все посты из базы
    res.json(posts);  // Отправляем их в ответ
  } catch (err) {
    res.status(500).json({ message: 'Ошибка получения данных' });
  }
});

connectDB();

app.use(express.json());
app.use('/api', authRoutes);

app.use('/api', postRoutes);

app.get('/', (req, res) => {
    res.send('API is running!');
});

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => console.log(error.message));







