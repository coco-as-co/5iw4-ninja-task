import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import ecsFormat from '@elastic/ecs-winston-format';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { TaskModule } from './task/task.module';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
@Module({
  imports: [
    TaskModule,
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test', 'provision')
          .default('development'),
        PORT: Joi.number().default(5009),
        DATABASE_URL: Joi.string().required(),
      }),
    }),
    WinstonModule.forRoot({
      format: winston.format.json(),
      defaultMeta: {
        'label.api-name': 'task',
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        new winston.transports.File({
          filename: process.env.LOG_FILE || 'task.log',
          format: ecsFormat(),
          level: 'error',
        }),
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
