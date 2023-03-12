import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  create(createTaskDto: CreateTaskDto) {
    return this.prisma.task.create({
      data: createTaskDto,
    });
  }

  findLast() {
    return this.prisma.task.findFirst({
      orderBy: {
        id: 'desc',
      },
    });
  }

  findAll() {
    return this.prisma.task.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  findAllWithPagination(cursor: number, take: number) {
    return this.prisma.task.findMany({
      take: take,
      where: {
        id: {
          gt: cursor,
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  countAll() {
    return this.prisma.task.count();
  }

  async findAllBy(condition: object) {
    return await this.prisma.task.findMany(condition);
  }

  async findById(id: number) {
    if (isNaN(id) || id < 0) {
      throw new BadRequestException(`Invalid id ${id}`);
    }

    const task = await this.prisma.task.findFirstOrThrow({
      where: { id },
    });

    return task;
  }

  async update(id: number, data: UpdateTaskDto) {
    const task = await this.findById(id);

    try {
      return this.prisma.task.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException(`Task with id ${id} not found`);
      }
      if (error?.code === 'P2002') {
        throw new BadRequestException(`Invalid id ${id}`);
      }
      if (error?.code === 'P2003') {
        throw new BadRequestException(
          `Foreign key constraint failed on the Taskwith id ${id}`,
        );
      }
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.task.delete({
        where: { id },
      });
    } catch (error) {
      if (error?.code === 'P2025') {
        throw new NotFoundException(`Task with id ${id} not found`);
      }
      if (error?.code === 'P2002') {
        throw new BadRequestException(`Invalid id ${id}`);
      }
      if (error?.code === 'P2003') {
        throw new BadRequestException(
          `Foreign key constraint failed on the Task with id ${id}`,
        );
      }
      throw new BadRequestException(error.message);
    }
  }

  async removeAll() {
    try {
      return await (
        await this.prisma.task.deleteMany()
      ).count;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
