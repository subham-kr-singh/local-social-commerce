// backend/server.ts
import app from './src/app.js';
import { prisma } from './src/Config/prisma.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './src/Config/db.js';

dotenv.config();

async function bootstrap() {
  try {
    // Connect Mongoose
    await connectDB();

    // Verify Prisma connection
    await prisma.$connect();
    console.log('🗄️  Prisma connected');

    app.httpServer.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server ready on port ${process.env.PORT || 5000}`);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();